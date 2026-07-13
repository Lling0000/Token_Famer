import { timingSafeEqual } from 'node:crypto';

import { and, eq, gte, isNull, sql } from 'drizzle-orm';

import { calculateApiCharge, type ModelPriceVersion } from '@token-farmer/gateway';
import type { Database } from '@token-farmer/db-runtime';
import {
  apiKeys,
  ledgerEntries,
  modelUsageEvents,
  reservations,
  wallets,
} from '@token-farmer/db-runtime/internal/schema';
import { ratio, tokenAmount, utcInstant } from '@token-farmer/primitives';

import { hashSecret } from '../security';
import { UNIFIED_CREDIT_ACCOUNT } from './credit-wallet';

export interface AuthorizedApiKey {
  id: string;
  userId: string;
  allowedModels: string[];
}

export interface UsageReservation {
  id: string;
  walletId: string;
  requestId: string;
  apiKey: AuthorizedApiKey;
  modelId: string;
  heldTokens: bigint;
}

export interface UsageSettlementInput {
  reservation: UsageReservation;
  inputTokens: bigint;
  outputTokens: bigint;
  latencyMilliseconds: number;
  provider: 'mock' | 'teamorouter';
  now: Date;
}

const modelMultiplier = (modelId: string): bigint => {
  if (modelId === 'gpt-5.4') return 4n;
  if (modelId === 'claude-sonnet-4-6') return 3n;
  if (modelId.startsWith('claude-opus-')) return 6n;
  return 1n;
};

const modelPrice = (modelId: string): ModelPriceVersion => {
  const multiplier = modelMultiplier(modelId);
  return {
    version: 'gateway-price-v1',
    modelId,
    effectiveFrom: utcInstant('2026-01-01T00:00:00.000Z'),
    inputRate: ratio(multiplier, 1n),
    outputRate: ratio(multiplier * 3n, 1n),
    cacheWriteRate: ratio(multiplier, 1n),
    cacheReadRate: ratio(multiplier, 4n),
  };
};

export const authorizeApiKey = async (
  db: Database,
  pepper: string,
  authorization: string | undefined,
): Promise<AuthorizedApiKey> => {
  const value = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  const prefix = value.split('.')[0];
  if (!value || !prefix) throw new Error('A valid Bearer API key is required');
  const key = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.prefix, prefix), isNull(apiKeys.revokedAt)),
  });
  if (!key) throw new Error('A valid Bearer API key is required');
  const expected = Buffer.from(key.secretHash, 'hex');
  const actual = Buffer.from(hashSecret(value, pepper), 'hex');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error('A valid Bearer API key is required');
  }
  return { id: key.id, userId: key.userId, allowedModels: key.allowedModels };
};

const chargeForUsage = (modelId: string, inputTokens: bigint, outputTokens: bigint): bigint =>
  calculateApiCharge(
    {
      uncachedInputTokens: tokenAmount(inputTokens),
      outputTokens: tokenAmount(outputTokens),
      cacheWriteTokens: tokenAmount(0n),
      cacheReadTokens: tokenAmount(0n),
    },
    modelPrice(modelId),
  ).totalCharge;

// eslint-disable-next-line max-lines-per-function -- Wallet hold and durable reservation are one atomic command.
export const reserveUsage = async (
  db: Database,
  input: {
    requestId: string;
    apiKey: AuthorizedApiKey;
    modelId: string;
    maximumInputTokens: bigint;
    maximumOutputTokens: bigint;
    now: Date;
  },
): Promise<UsageReservation> => {
  if (!input.apiKey.allowedModels.includes(input.modelId)) {
    throw new Error('This API key is not allowed to use the requested model');
  }
  const heldTokens = chargeForUsage(
    input.modelId,
    input.maximumInputTokens,
    input.maximumOutputTokens,
  );
  const businessReference = `api:${input.requestId}:reserve`;
  return db.transaction(async (transaction) => {
    const replay = await transaction.query.reservations.findFirst({
      where: eq(reservations.businessReference, businessReference),
    });
    if (replay) {
      return { ...input, id: replay.id, walletId: replay.walletId, heldTokens: replay.amount };
    }
    const held = await transaction
      .update(wallets)
      .set({
        available: sql`${wallets.available} - ${heldTokens}`,
        reserved: sql`${wallets.reserved} + ${heldTokens}`,
        version: sql`${wallets.version} + 1`,
        updatedAt: input.now,
      })
      .where(
        and(
          eq(wallets.userId, input.apiKey.userId),
          eq(wallets.modelId, UNIFIED_CREDIT_ACCOUNT),
          gte(wallets.available, heldTokens),
        ),
      )
      .returning();
    const wallet = held[0];
    if (!wallet) throw new Error('Insufficient token balance');
    const inserted = await transaction
      .insert(reservations)
      .values({
        walletId: wallet.id,
        amount: heldTokens,
        status: 'reserved',
        businessReference,
        expiresAt: new Date(input.now.getTime() + 5 * 60 * 1_000),
      })
      .returning({ id: reservations.id });
    const reservation = inserted[0];
    if (!reservation) throw new Error('API reservation insert failed');
    return { ...input, id: reservation.id, walletId: wallet.id, heldTokens };
  });
};

// eslint-disable-next-line max-lines-per-function -- Settlement releases the hold, writes usage, and appends the debit atomically.
export const settleUsage = async (db: Database, input: UsageSettlementInput): Promise<bigint> => {
  const charge = chargeForUsage(input.reservation.modelId, input.inputTokens, input.outputTokens);
  // eslint-disable-next-line max-lines-per-function -- Settlement records wallet, ledger, usage, and reservation together.
  return db.transaction(async (transaction) => {
    const lockedReservations = await transaction
      .select()
      .from(reservations)
      .where(eq(reservations.id, input.reservation.id))
      .for('update');
    const reservation = lockedReservations[0];
    if (!reservation) throw new Error('API reservation is missing');
    const replay = await transaction.query.modelUsageEvents.findFirst({
      where: eq(modelUsageEvents.requestId, input.reservation.requestId),
    });
    if (replay) return replay.chargedTokens;
    if (reservation.status !== 'reserved') throw new Error('API reservation cannot be settled');
    const lockedWallets = await transaction
      .select()
      .from(wallets)
      .where(eq(wallets.id, reservation.walletId))
      .for('update');
    const wallet = lockedWallets[0];
    if (!wallet || wallet.reserved < reservation.amount) {
      throw new Error('API reservation settlement failed');
    }
    const releasedBalance = wallet.available + reservation.amount;
    if (releasedBalance < charge) throw new Error('Insufficient token balance');
    const balanceAfter = releasedBalance - charge;
    await transaction
      .update(wallets)
      .set({
        available: balanceAfter,
        reserved: wallet.reserved - reservation.amount,
        version: sql`${wallets.version} + 1`,
        updatedAt: input.now,
      })
      .where(eq(wallets.id, wallet.id));
    await transaction.insert(ledgerEntries).values({
      walletId: wallet.id,
      amount: -charge,
      direction: 'debit',
      entryType: 'api_usage',
      businessReference: `api:${input.reservation.requestId}`,
      balanceAfter,
      metadata: { modelId: input.reservation.modelId, priceVersion: 'gateway-price-v1' },
    });
    await transaction.insert(modelUsageEvents).values({
      requestId: input.reservation.requestId,
      userId: input.reservation.apiKey.userId,
      apiKeyId: input.reservation.apiKey.id,
      modelId: input.reservation.modelId,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      chargedTokens: charge,
      provider: input.provider,
      status: 'succeeded',
      latencyMilliseconds: input.latencyMilliseconds,
    });
    await transaction
      .update(reservations)
      .set({ status: 'settled', settledAt: input.now })
      .where(eq(reservations.id, input.reservation.id));
    await transaction
      .update(apiKeys)
      .set({ lastUsedAt: input.now })
      .where(eq(apiKeys.id, input.reservation.apiKey.id));
    return charge;
  });
};

export const releaseUsage = async (
  db: Database,
  reservationInput: UsageReservation,
  now: Date,
): Promise<void> => {
  await db.transaction(async (transaction) => {
    const locked = await transaction
      .select()
      .from(reservations)
      .where(eq(reservations.id, reservationInput.id))
      .for('update');
    const reservation = locked[0];
    if (!reservation || reservation.status !== 'reserved') return;
    await transaction
      .update(wallets)
      .set({
        available: sql`${wallets.available} + ${reservation.amount}`,
        reserved: sql`${wallets.reserved} - ${reservation.amount}`,
        version: sql`${wallets.version} + 1`,
        updatedAt: now,
      })
      .where(and(eq(wallets.id, reservation.walletId), gte(wallets.reserved, reservation.amount)));
    await transaction
      .update(reservations)
      .set({ status: 'released', settledAt: now })
      .where(eq(reservations.id, reservation.id));
  });
};
