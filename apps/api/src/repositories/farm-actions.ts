import { createHash, randomBytes } from 'node:crypto';

import { and, eq, gte, sql } from 'drizzle-orm';

import type { Database } from '@token-farmer/db-runtime';
import {
  cropCatalog,
  ledgerEntries,
  plantings,
  plots,
  tokenPacks,
  users,
  wallets,
} from '@token-farmer/db-runtime/internal/schema';

import type { AppConfig } from '../config';
import { UNIFIED_CREDIT_ACCOUNT } from './credit-wallet';
import { decryptField, encryptField } from '../security';

const multiplierForRoll = (roll: number): number => {
  if (roll < 800) return 5_000;
  if (roll < 8_300) return 10_000;
  if (roll < 9_800) return 11_000;
  return 14_500;
};

const stealRatioForRoll = (roll: number): number => {
  if (roll < 45) return 5;
  if (roll < 75) return 10;
  if (roll < 90) return 20;
  if (roll < 98) return 30;
  return 40;
};

const fruitFromSeed = (seed: Buffer, baseFruitNum: number, quality: number) => {
  const outcomeRoll = seed.readUInt16BE(0) % 10_000;
  const multiplier = multiplierForRoll(outcomeRoll);
  const qualityBasisPoints = 10_000 + quality * 500;
  const fruitNum = Math.max(
    1,
    Math.floor((baseFruitNum * multiplier * qualityBasisPoints) / 100_000_000),
  );
  const stealRatio = stealRatioForRoll(seed[2] ?? 0);
  return {
    fruitNum,
    maxStealableFruit: Math.max(1, Math.floor((fruitNum * stealRatio) / 100)),
  };
};

export interface PlantPlotInput {
  userId: string;
  plotId: string;
  cropLevel: number;
  modelId: string;
  idempotencyKey: string;
  now: Date;
}

// eslint-disable-next-line max-lines-per-function -- Coordinates one atomic planting and wallet ledger workflow.
export const plantPlot = async (
  db: Database,
  config: AppConfig,
  input: PlantPlotInput,
): Promise<{ plantingId: string; matureAt: Date }> => {
  const reference = `plant:${input.userId}:${input.idempotencyKey}`;
  const existing = await db.query.plantings.findFirst({
    where: eq(plantings.businessReference, reference),
  });
  if (existing) return { plantingId: existing.id, matureAt: existing.matureAt };

  // eslint-disable-next-line max-lines-per-function, complexity -- Every planting invariant must share this database transaction.
  return db.transaction(async (transaction) => {
    const lockedPlots = await transaction
      .select()
      .from(plots)
      .where(and(eq(plots.id, input.plotId), eq(plots.userId, input.userId)))
      .for('update');
    const replay = await transaction.query.plantings.findFirst({
      where: eq(plantings.businessReference, reference),
    });
    if (replay) return { plantingId: replay.id, matureAt: replay.matureAt };
    const [crop, owner] = await Promise.all([
      transaction.query.cropCatalog.findFirst({ where: eq(cropCatalog.level, input.cropLevel) }),
      transaction.query.users.findFirst({ where: eq(users.id, input.userId) }),
    ]);
    const plot = lockedPlots[0];
    if (!plot || plot.state !== 'empty') throw new Error('Plot is not available');
    if (!crop || !crop.enabled) throw new Error('Crop is not available');
    if (!owner || crop.level > owner.level) throw new Error('Crop level is locked');
    const seedCost = BigInt(crop.seedCostWeight) * 10_000n;
    const updatedWallet = await transaction
      .update(wallets)
      .set({
        available: sql`${wallets.available} - ${seedCost}`,
        version: sql`${wallets.version} + 1`,
        updatedAt: input.now,
      })
      .where(
        and(
          eq(wallets.userId, input.userId),
          eq(wallets.modelId, UNIFIED_CREDIT_ACCOUNT),
          gte(wallets.available, seedCost),
        ),
      )
      .returning();
    const wallet = updatedWallet[0];
    if (!wallet) throw new Error('Insufficient token balance');

    const seed = randomBytes(32);
    const commit = createHash('sha256').update(seed).digest('hex');
    const result = fruitFromSeed(seed, crop.baseFruitNum, plot.quality);
    const growthMilliseconds = Math.max(
      1_000,
      (crop.growthSeconds * 1_000) / config.GAME_TIME_SCALE,
    );
    const matureAt = new Date(input.now.getTime() + growthMilliseconds);
    const inserted = await transaction
      .insert(plantings)
      .values({
        businessReference: reference,
        plotId: plot.id,
        ownerId: input.userId,
        cropLevel: crop.level,
        modelId: input.modelId,
        state: 'growing',
        seedCost,
        fruitNum: result.fruitNum,
        leftFruitNum: result.fruitNum,
        maxStealableFruit: crop.level === 0 ? 0 : result.maxStealableFruit,
        randomCommit: commit,
        randomSeedCiphertext: encryptField(seed.toString('base64url'), config.FIELD_ENCRYPTION_KEY),
        ruleVersionId: 'harvest-v1',
        plantedAt: input.now,
        matureAt,
      })
      .returning({ id: plantings.id });
    const planting = inserted[0];
    if (!planting) throw new Error('Planting insert failed');
    await transaction
      .update(plots)
      .set({ state: 'growing', updatedAt: input.now })
      .where(eq(plots.id, plot.id));
    await transaction.insert(ledgerEntries).values({
      walletId: wallet.id,
      amount: -seedCost,
      direction: 'debit',
      entryType: 'plant_seed',
      businessReference: reference,
      balanceAfter: wallet.available,
      metadata: { cropLevel: crop.level, plotId: plot.id },
    });
    return { plantingId: planting.id, matureAt };
  });
};

// eslint-disable-next-line max-lines-per-function -- Coordinates one atomic harvest, reward pack, and experience workflow.
export const harvestPlot = async (
  db: Database,
  config: AppConfig,
  userId: string,
  plotId: string,
  now: Date,
): Promise<{ tokenPackId: string; amount: bigint; reveal: string }> =>
  // eslint-disable-next-line max-lines-per-function -- Harvest reward creation and state transition cannot be split.
  db.transaction(async (transaction) => {
    const locked = await transaction
      .select()
      .from(plantings)
      .where(and(eq(plantings.plotId, plotId), eq(plantings.ownerId, userId)))
      .for('update');
    const planting = locked.sort(
      (left, right) => right.plantedAt.getTime() - left.plantedAt.getTime(),
    )[0];
    if (!planting) throw new Error('Crop is not mature');
    const sourceReference = `harvest:${planting.id}`;
    const existing = await transaction.query.tokenPacks.findFirst({
      where: eq(tokenPacks.sourceReference, sourceReference),
    });
    if (existing) {
      return {
        tokenPackId: existing.id,
        amount: existing.amount,
        reveal: decryptField(planting.randomSeedCiphertext, config.FIELD_ENCRYPTION_KEY),
      };
    }
    if (planting.state !== 'mature' || planting.matureAt > now) {
      throw new Error('Crop is not mature');
    }
    const crop = await transaction.query.cropCatalog.findFirst({
      where: eq(cropCatalog.level, planting.cropLevel),
    });
    if (!crop) throw new Error('Crop definition is missing');
    const amount =
      (crop.baseRewardTokens * BigInt(planting.leftFruitNum)) / BigInt(crop.baseFruitNum);
    const inserted = await transaction
      .insert(tokenPacks)
      .values({
        userId,
        modelId: planting.modelId,
        amount,
        source: 'harvest',
        sourceReference,
        metadata: {
          plantingId: planting.id,
          fruitNum: planting.fruitNum,
          leftFruitNum: planting.leftFruitNum,
          stoleNum: planting.stoleNum,
          commit: planting.randomCommit,
        },
      })
      .returning({ id: tokenPacks.id });
    const pack = inserted[0];
    if (!pack) throw new Error('Token pack insert failed');
    await transaction
      .update(plantings)
      .set({ state: 'harvested', harvestedAt: now })
      .where(eq(plantings.id, planting.id));
    await transaction
      .update(plots)
      .set({ state: 'clearing', updatedAt: now })
      .where(eq(plots.id, plotId));
    await transaction
      .update(users)
      .set({
        experience: sql`${users.experience} + ${BigInt(planting.cropLevel * 5)}`,
        updatedAt: now,
      })
      .where(eq(users.id, userId));
    return {
      tokenPackId: pack.id,
      amount,
      reveal: decryptField(planting.randomSeedCiphertext, config.FIELD_ENCRYPTION_KEY),
    };
  });

export const clearPlot = async (
  db: Database,
  userId: string,
  plotId: string,
  now: Date,
): Promise<void> => {
  const result = await db
    .update(plots)
    .set({ state: 'empty', updatedAt: now })
    .where(and(eq(plots.id, plotId), eq(plots.userId, userId), eq(plots.state, 'clearing')))
    .returning({ id: plots.id });
  if (result.length === 0) throw new Error('Plot does not need clearing');
};
