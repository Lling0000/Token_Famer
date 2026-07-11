import { randomBytes, randomInt } from 'node:crypto';

import { and, eq, isNull, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { Database, DatabaseTransaction } from '@token-farmer/db-runtime';
import {
  invitations,
  ledgerEntries,
  plots,
  sessions,
  users,
  wallets,
} from '@token-farmer/db-runtime/internal/schema';

import { createTotpSecret, hashPassword, verifyPassword, verifyTotp } from '../auth-crypto';
import type { AppConfig } from '../config';
import { requireIdempotencyKey } from '../http/idempotency';
import { UNIFIED_CREDIT_ACCOUNT } from '../repositories/credit-wallet';
import { decryptField, encryptField, hashSecret } from '../security';

const registerSchema = z.object({
  inviteCode: z.string().min(8).max(128),
  email: z
    .string()
    .email()
    .max(320)
    .transform((value) => value.toLowerCase()),
  displayName: z.string().min(2).max(40),
  password: z.string().min(12).max(128),
});
const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});
const loginSchema = z.object({ email: z.string().email(), password: z.string(), totp: z.string() });

const grantWelcomeTokens = async (
  transaction: DatabaseTransaction,
  userId: string,
  now: Date,
): Promise<boolean> => {
  const claimed = await transaction
    .update(users)
    .set({ welcomeGrantClaimedAt: now, updatedAt: now })
    .where(and(eq(users.id, userId), isNull(users.welcomeGrantClaimedAt)))
    .returning({ id: users.id });
  if (claimed.length === 0) return false;
  const updated = await transaction
    .update(wallets)
    .set({
      available: sql`${wallets.available} + ${80_000n}`,
      version: sql`${wallets.version} + 1`,
      updatedAt: now,
    })
    .where(and(eq(wallets.userId, userId), eq(wallets.modelId, UNIFIED_CREDIT_ACCOUNT)))
    .returning();
  const wallet = updated[0];
  if (!wallet) throw new Error('Credit wallet was not found');
  await transaction.insert(ledgerEntries).values({
    walletId: wallet.id,
    amount: 80_000n,
    direction: 'credit',
    entryType: 'welcome_grant',
    businessReference: `welcome:${userId}:unified-v1`,
    balanceAfter: wallet.available,
    metadata: { permanent: true, allocation: 'unified' },
  });
  return true;
};

export const ensureSandboxInvitation = async (db: Database, config: AppConfig): Promise<void> => {
  const codeHash = hashSecret('TOKEN-FARMER-ALPHA', config.BETTER_AUTH_SECRET);
  await db
    .insert(invitations)
    .values({
      codeHash,
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    })
    .onConflictDoNothing();
};

// eslint-disable-next-line max-lines-per-function -- Keeps the three tightly coupled invitation authentication endpoints discoverable.
export const registerAuthRoutes = async (
  app: FastifyInstance,
  db: Database,
  config: AppConfig,
): Promise<void> => {
  // eslint-disable-next-line max-lines-per-function -- Registration atomically consumes an invite and provisions the account aggregate.
  app.post('/api/auth/register', async (request) => {
    requireIdempotencyKey(request.headers);
    const body = registerSchema.parse(request.body);
    const now = new Date();
    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.codeHash, hashSecret(body.inviteCode, config.BETTER_AUTH_SECRET)),
    });
    if (!invitation || invitation.usedAt || invitation.expiresAt <= now)
      throw new Error('Invitation is invalid or expired');
    const secret = createTotpSecret();
    const verificationCode = randomInt(100_000, 1_000_000).toString();
    const passwordHash = await hashPassword(body.password);
    const user = await db.transaction(async (transaction) => {
      const inserted = await transaction
        .insert(users)
        .values({
          email: body.email,
          displayName: body.displayName,
          passwordHash,
          status: 'invited',
          emailVerificationCodeHash: hashSecret(verificationCode, config.BETTER_AUTH_SECRET),
          emailVerificationExpiresAt: new Date(now.getTime() + 15 * 60 * 1_000),
          twoFactorSecretCiphertext: encryptField(secret, config.FIELD_ENCRYPTION_KEY),
          friendCode: randomBytes(6).toString('hex').toUpperCase(),
        })
        .returning({ id: users.id, email: users.email });
      const created = inserted[0];
      if (!created) throw new Error('Account insert failed');
      await transaction
        .update(invitations)
        .set({ usedAt: now, usedBy: created.id })
        .where(eq(invitations.id, invitation.id));
      await transaction.insert(wallets).values({
        userId: created.id,
        modelId: UNIFIED_CREDIT_ACCOUNT,
      });
      await transaction.insert(plots).values(
        Array.from({ length: 24 }, (_, index) => ({
          userId: created.id,
          plotIndex: index,
          state: index < 6 ? ('empty' as const) : ('locked' as const),
        })),
      );
      return created;
    });
    return {
      userId: user.id,
      email: user.email,
      totpUri: `otpauth://totp/Token%20Farmer:${encodeURIComponent(user.email)}?secret=${secret}&issuer=Token%20Farmer`,
      ...(config.NODE_ENV === 'production' ? {} : { sandboxVerificationCode: verificationCode }),
    };
  });

  app.post('/api/auth/verify-email', async (request) => {
    requireIdempotencyKey(request.headers);
    const body = verifyEmailSchema.parse(request.body);
    const now = new Date();
    const updated = await db
      .update(users)
      .set({
        status: 'active',
        emailVerifiedAt: now,
        emailVerificationCodeHash: null,
        emailVerificationExpiresAt: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(users.email, body.email.toLowerCase()),
          eq(users.emailVerificationCodeHash, hashSecret(body.code, config.BETTER_AUTH_SECRET)),
          sql`${users.emailVerificationExpiresAt} > ${now}`,
        ),
      )
      .returning({ id: users.id });
    if (updated.length === 0) throw new Error('Verification code is invalid or expired');
    return { verified: true };
  });

  app.post('/api/auth/login', async (request) => {
    requireIdempotencyKey(request.headers);
    const body = loginSchema.parse(request.body);
    const user = await db.query.users.findFirst({
      where: eq(users.email, body.email.toLowerCase()),
    });
    if (!user || user.status !== 'active' || !user.emailVerifiedAt)
      throw new Error('Email or password is invalid');
    if (!(await verifyPassword(body.password, user.passwordHash)))
      throw new Error('Email or password is invalid');
    if (!user.twoFactorSecretCiphertext)
      throw new Error('Two-factor authentication is not configured');
    const now = new Date();
    const secret = decryptField(user.twoFactorSecretCiphertext, config.FIELD_ENCRYPTION_KEY);
    if (!verifyTotp(body.totp, secret, now)) throw new Error('Two-factor code is invalid');
    const sessionToken = randomBytes(32).toString('base64url');
    const firstLoginGrant = await db.transaction(async (transaction) => {
      const granted = await grantWelcomeTokens(transaction, user.id, now);
      await transaction.insert(sessions).values({
        userId: user.id,
        tokenHash: hashSecret(sessionToken, config.BETTER_AUTH_SECRET),
        twoFactorVerified: true,
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1_000),
      });
      return granted;
    });
    return { sessionToken, expiresInSeconds: 2_592_000, firstLoginGrant };
  });
};
