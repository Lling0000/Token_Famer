import { and, eq, inArray, lte } from 'drizzle-orm';

import { MODEL_IDS, type Bootstrap, type Plot } from '@token-farmer/contracts';
import type { Database } from '@token-farmer/db-runtime';
import {
  plantings,
  plots,
  tokenPacks,
  users,
  wallets,
} from '@token-farmer/db-runtime/internal/schema';

import { UNIFIED_CREDIT_ACCOUNT } from './credit-wallet';

const advanceMaturePlantings = async (db: Database, userId: string, now: Date): Promise<void> => {
  const ready = await db
    .select({ id: plantings.id, plotId: plantings.plotId })
    .from(plantings)
    .where(
      and(
        eq(plantings.ownerId, userId),
        eq(plantings.state, 'growing'),
        lte(plantings.matureAt, now),
      ),
    );
  if (ready.length === 0) return;
  await db.transaction(async (transaction) => {
    await transaction
      .update(plantings)
      .set({ state: 'mature' })
      .where(
        inArray(
          plantings.id,
          ready.map((row) => row.id),
        ),
      );
    await transaction
      .update(plots)
      .set({ state: 'mature', updatedAt: now })
      .where(
        inArray(
          plots.id,
          ready.map((row) => row.plotId),
        ),
      );
  });
};

const friendFixtures = [
  ['Mei', 8, 4, 6, true, 11],
  ['Lin', 6, 2, 3, false, 27],
  ['Nora', 12, 5, 8, true, 33],
  ['Kai', 4, 1, 0, false, 49],
] as const;

// eslint-disable-next-line max-lines-per-function -- Builds the single documented bootstrap read model in one place.
export const loadBootstrap = async (
  db: Database,
  userId: string,
  now: Date,
): Promise<Bootstrap> => {
  await advanceMaturePlantings(db, userId, now);
  const [user, walletRows, plotRows, plantingRows, packRows] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, userId) }),
    db.select().from(wallets).where(eq(wallets.userId, userId)),
    db.select().from(plots).where(eq(plots.userId, userId)).orderBy(plots.plotIndex),
    db
      .select()
      .from(plantings)
      .where(and(eq(plantings.ownerId, userId), inArray(plantings.state, ['growing', 'mature']))),
    db.select().from(tokenPacks).where(eq(tokenPacks.userId, userId)),
  ]);
  if (!user) throw new Error('Sandbox user is missing');
  const plantingByPlot = new Map(plantingRows.map((planting) => [planting.plotId, planting]));
  const creditWallet = walletRows.find((wallet) => wallet.modelId === UNIFIED_CREDIT_ACCOUNT);
  // eslint-disable-next-line complexity -- Wire mapping intentionally normalizes every nullable planting field.
  const mappedPlots: Plot[] = plotRows.map((plot) => {
    const planting = plantingByPlot.get(plot.id);
    return {
      id: plot.id,
      index: plot.plotIndex,
      state: plot.state,
      quality: plot.quality,
      cropLevel: planting?.cropLevel ?? null,
      modelId: (planting?.modelId as Plot['modelId']) ?? null,
      plantedAt: planting?.plantedAt.toISOString() ?? null,
      matureAt: planting?.matureAt.toISOString() ?? null,
      fruitNum: planting?.fruitNum ?? 0,
      leftFruitNum: planting?.leftFruitNum ?? 0,
      stoleNum: planting?.stoleNum ?? 0,
      stealable: planting?.state === 'mature' && planting.maxStealableFruit > planting.stoleNum,
      event: 'none',
    };
  });
  return {
    profile: {
      id: user.id,
      name: user.displayName,
      level: user.level,
      experience: Number(user.experience),
      nextLevelExperience: 100 * user.level * user.level,
      petals: Number(user.petals),
    },
    models: [...MODEL_IDS],
    creditBalance: creditWallet?.available.toString() ?? '0',
    plots: mappedPlots,
    friends: friendFixtures.map(
      ([name, level, intimacyLevel, stealablePlots, online, avatarSeed], index) => ({
        id: `friend-${index + 1}`,
        name,
        level,
        intimacyLevel,
        stealablePlots,
        online,
        avatarSeed,
      }),
    ),
    tokenPacks: packRows.map((pack) => ({
      id: pack.id,
      modelId: pack.modelId as Bootstrap['tokenPacks'][number]['modelId'],
      amount: pack.amount.toString(),
      source: pack.source,
      activatedAt: pack.activatedAt?.toISOString() ?? null,
      createdAt: pack.createdAt.toISOString(),
    })),
  };
};
