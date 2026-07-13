import { and, eq, sql } from 'drizzle-orm';

import type { Database } from '@token-farmer/db-runtime';
import { ledgerEntries, tokenPacks, wallets } from '@token-farmer/db-runtime/internal/schema';

import { UNIFIED_CREDIT_ACCOUNT } from './credit-wallet';

export const activateTokenPack = async (
  db: Database,
  userId: string,
  tokenPackId: string,
  now: Date,
): Promise<{ amount: bigint; balance: bigint }> =>
  db.transaction(async (transaction) => {
    const locked = await transaction
      .select()
      .from(tokenPacks)
      .where(and(eq(tokenPacks.id, tokenPackId), eq(tokenPacks.userId, userId)))
      .for('update');
    const pack = locked[0];
    if (!pack) throw new Error('Token pack is missing');
    if (pack.activatedAt) {
      const wallet = await transaction.query.wallets.findFirst({
        where: and(eq(wallets.userId, userId), eq(wallets.modelId, UNIFIED_CREDIT_ACCOUNT)),
      });
      if (!wallet) throw new Error('Wallet is missing');
      return { amount: pack.amount, balance: wallet.available };
    }
    const updated = await transaction
      .update(wallets)
      .set({
        available: sql`${wallets.available} + ${pack.amount}`,
        version: sql`${wallets.version} + 1`,
        updatedAt: now,
      })
      .where(and(eq(wallets.userId, userId), eq(wallets.modelId, UNIFIED_CREDIT_ACCOUNT)))
      .returning();
    const wallet = updated[0];
    if (!wallet) throw new Error('Wallet is missing');
    const activationReference = `activate:${pack.id}`;
    await transaction
      .update(tokenPacks)
      .set({ activatedAt: now })
      .where(eq(tokenPacks.id, pack.id));
    await transaction.insert(ledgerEntries).values({
      walletId: wallet.id,
      amount: pack.amount,
      direction: 'credit',
      entryType: 'activate_token_pack',
      businessReference: activationReference,
      balanceAfter: wallet.available,
      metadata: { tokenPackId: pack.id, source: pack.source },
    });
    return { amount: pack.amount, balance: wallet.available };
  });
