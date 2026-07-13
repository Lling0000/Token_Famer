import { and, eq } from 'drizzle-orm';

import type { Database } from '@token-farmer/db-runtime';
import {
  friendships,
  cropEvents,
  ledgerEntries,
  plantings,
  plots,
  users,
  wallets,
} from '@token-farmer/db-runtime/internal/schema';

import { UNIFIED_CREDIT_ACCOUNT } from './credit-wallet';

export const SANDBOX_USER_ID = '00000000-0000-4000-8000-000000000001';
export const SANDBOX_FRIEND_ID = '00000000-0000-4000-8000-000000000002';
const legacyModelWallets = [
  'gpt-5.4-mini',
  'gpt-5.4',
  'claude-sonnet-4-6',
  'claude-opus-4-8',
] as const;

// eslint-disable-next-line max-lines-per-function -- Seeds the complete deterministic sandbox aggregate for local acceptance tests.
export const ensureSandboxAccount = async (db: Database): Promise<string> => {
  // eslint-disable-next-line max-lines-per-function, complexity -- Sandbox fixtures must either all exist or all roll back.
  await db.transaction(async (transaction) => {
    await transaction
      .insert(users)
      .values({
        id: SANDBOX_USER_ID,
        email: 'farmer@tokenfarmer.local',
        displayName: 'Token Farmer',
        passwordHash: 'sandbox-account-disabled-password',
        status: 'active',
        emailVerifiedAt: new Date(),
        welcomeGrantClaimedAt: new Date(),
        friendCode: 'FARM-2026',
        level: 1,
        experience: 0n,
        petals: 360n,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      })
      .onConflictDoNothing();

    await transaction
      .insert(users)
      .values({
        id: SANDBOX_FRIEND_ID,
        email: 'pixel@tokenfarmer.local',
        displayName: '像素阿禾',
        passwordHash: 'sandbox-friend-disabled-password',
        status: 'active',
        emailVerifiedAt: new Date('2025-01-01T00:00:00.000Z'),
        welcomeGrantClaimedAt: new Date('2025-01-01T00:00:00.000Z'),
        friendCode: 'PIXEL-AHE',
        level: 12,
        experience: 82_000n,
        petals: 2_400n,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      })
      .onConflictDoNothing();

    await transaction
      .insert(friendships)
      .values({
        userLowId: SANDBOX_USER_ID,
        userHighId: SANDBOX_FRIEND_ID,
        requestedBy: SANDBOX_USER_ID,
        status: 'accepted',
        intimacyPoints: 420,
        pranksAllowed: true,
        acceptedAt: new Date('2025-01-02T00:00:00.000Z'),
      })
      .onConflictDoNothing();

    for (const modelId of legacyModelWallets) {
      await transaction
        .insert(wallets)
        .values({
          userId: SANDBOX_USER_ID,
          modelId,
          available: 0n,
          reserved: 0n,
        })
        .onConflictDoNothing();
    }

    await transaction
      .insert(wallets)
      .values({ userId: SANDBOX_USER_ID, modelId: UNIFIED_CREDIT_ACCOUNT, available: 80_000n })
      .onConflictDoNothing();
    const creditWallet = await transaction.query.wallets.findFirst({
      where: and(eq(wallets.userId, SANDBOX_USER_ID), eq(wallets.modelId, UNIFIED_CREDIT_ACCOUNT)),
    });
    if (creditWallet) {
      await transaction
        .insert(ledgerEntries)
        .values({
          walletId: creditWallet.id,
          amount: 80_000n,
          direction: 'credit',
          entryType: 'welcome_grant',
          businessReference: `welcome:${SANDBOX_USER_ID}:unified-v1`,
          balanceAfter: creditWallet.available,
          metadata: { permanent: true, allocation: 'unified' },
        })
        .onConflictDoNothing();
    }

    for (let plotIndex = 0; plotIndex < 24; plotIndex += 1) {
      await transaction
        .insert(plots)
        .values({
          userId: SANDBOX_USER_ID,
          plotIndex,
          state: plotIndex < 6 ? 'empty' : 'locked',
          quality: 0,
        })
        .onConflictDoNothing();
      await transaction
        .insert(plots)
        .values({
          userId: SANDBOX_FRIEND_ID,
          plotIndex,
          state: plotIndex === 0 ? 'mature' : plotIndex < 20 ? 'empty' : 'locked',
          quality: 1,
        })
        .onConflictDoNothing();
    }

    const friendPlot = await transaction.query.plots.findFirst({
      where: and(eq(plots.userId, SANDBOX_FRIEND_ID), eq(plots.plotIndex, 0)),
    });
    if (friendPlot) {
      await transaction
        .insert(plantings)
        .values({
          businessReference: 'sandbox-friend-mature-v1',
          plotId: friendPlot.id,
          ownerId: SANDBOX_FRIEND_ID,
          cropLevel: 4,
          modelId: 'gpt-5.4-mini',
          state: 'mature',
          seedCost: 100_000n,
          fruitNum: 20,
          leftFruitNum: 20,
          maxStealableFruit: 8,
          randomCommit: 'sandbox-friend-commit',
          randomSeedCiphertext: 'sandbox-friend-seed-not-revealed',
          ruleVersionId: 'harvest-v1',
          plantedAt: new Date('2026-01-01T00:00:00.000Z'),
          matureAt: new Date('2026-01-01T00:10:00.000Z'),
        })
        .onConflictDoNothing();
    }

    const growingPlot = await transaction.query.plots.findFirst({
      where: and(eq(plots.userId, SANDBOX_FRIEND_ID), eq(plots.plotIndex, 1)),
    });
    if (growingPlot) {
      await transaction
        .insert(plantings)
        .values({
          businessReference: 'sandbox-friend-growing-v1',
          plotId: growingPlot.id,
          ownerId: SANDBOX_FRIEND_ID,
          cropLevel: 8,
          modelId: 'deepseek-v4-pro',
          state: 'growing',
          seedCost: 840_000n,
          fruitNum: 40,
          leftFruitNum: 40,
          maxStealableFruit: 8,
          randomCommit: 'sandbox-growing-commit',
          randomSeedCiphertext: 'sandbox-growing-seed-not-revealed',
          ruleVersionId: 'harvest-v1',
          plantedAt: new Date('2026-07-11T00:00:00.000Z'),
          matureAt: new Date('2030-01-01T00:00:00.000Z'),
        })
        .onConflictDoNothing();
      await transaction.update(plots).set({ state: 'growing' }).where(eq(plots.id, growingPlot.id));
      const growingCrop = await transaction.query.plantings.findFirst({
        where: eq(plantings.businessReference, 'sandbox-friend-growing-v1'),
      });
      if (growingCrop) {
        const activeEvent = await transaction.query.cropEvents.findFirst({
          where: and(eq(cropEvents.plantingId, growingCrop.id), eq(cropEvents.state, 'active')),
        });
        if (!activeEvent) {
          await transaction.insert(cropEvents).values({
            plantingId: growingCrop.id,
            type: 'weed',
            state: 'active',
            freeAttempts: 1,
          });
        }
      }
    }
  });

  return SANDBOX_USER_ID;
};
