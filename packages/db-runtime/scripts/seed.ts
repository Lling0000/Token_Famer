import { createHash } from 'node:crypto';

import { sql as expression } from 'drizzle-orm';

import { createDatabase } from '../src/client';
import { cropCatalog, ruleVersions } from '../src/schema';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://token_farmer:token_farmer@localhost:5433/token_farmer';

const cropRows = [
  ['Byte Daisy', 1, 5, 60],
  ['Cache Clover', 2, 10, 120],
  ['Prompt Dandelion', 5, 20, 300],
  ['Pixel Tulip', 10, 20, 600],
  ['Stream Carnation', 21, 30, 1_200],
  ['Vector Lily', 42, 30, 2_400],
  ['Context Iris', 63, 40, 3_600],
  ['Relay Poppy', 84, 40, 4_800],
  ['Logic Camellia', 111, 60, 6_000],
  ['Agent Sunflower', 134, 60, 7_200],
  ['Reasoning Rose', 167, 80, 9_000],
  ['Memory Lavender', 201, 80, 10_800],
  ['Matrix Lotus', 288, 200, 14_400],
  ['Quantum Dahlia', 576, 200, 28_800],
  ['Token Orchid', 864, 200, 43_200],
] as const;

const harvestRule = {
  outcomes: [
    { upperExclusive: 800, multiplierBasisPoints: 5_000 },
    { upperExclusive: 8_300, multiplierBasisPoints: 10_000 },
    { upperExclusive: 9_800, multiplierBasisPoints: 11_000 },
    { upperExclusive: 10_000, multiplierBasisPoints: 14_500 },
  ],
  eventChecksBasisPoints: [3_500, 7_000],
  eventChanceBasisPoints: 3_000,
  freeTreatmentSuccessBasisPoints: 7_000,
};

const stealRule = {
  version: 'steal-v1',
  success: { baseBasisPoints: 3_500, intimacyStepBasisPoints: 600, maximumBasisPoints: 6_500 },
  budgetBands: ['5%', '10%', '20%', '30%', '40%'],
  amountBands: ['0.5%', '1%', '2%', '5%'],
  maximumDailyAttempts: 20,
};

const hash = createHash('sha256').update(JSON.stringify(harvestRule)).digest('hex');
const { db, sql } = createDatabase(databaseUrl);

await db
  .insert(cropCatalog)
  .values({
    level: 0,
    name: 'Starter Data Bloom',
    seedCostWeight: 0,
    baseRewardTokens: 100n,
    baseFruitNum: 1,
    growthSeconds: 60,
    experienceReward: 1,
  })
  .onConflictDoUpdate({
    target: cropCatalog.level,
    set: { baseRewardTokens: 100n, enabled: true },
  });

await db
  .insert(cropCatalog)
  .values(
    cropRows.map(([name, seedCostWeight, baseFruitNum, growthSeconds], index) => ({
      level: index + 1,
      name,
      seedCostWeight,
      baseRewardTokens: BigInt(seedCostWeight) * 10_000n,
      baseFruitNum,
      growthSeconds,
      experienceReward: (index + 1) * 5,
    })),
  )
  .onConflictDoUpdate({
    target: cropCatalog.level,
    set: {
      name: expression`excluded.name`,
      seedCostWeight: expression`excluded.seed_cost_weight`,
      baseRewardTokens: expression`excluded.base_reward_tokens`,
      baseFruitNum: expression`excluded.base_fruit_num`,
      growthSeconds: expression`excluded.growth_seconds`,
      experienceReward: expression`excluded.experience_reward`,
      enabled: true,
    },
  });

await db
  .insert(ruleVersions)
  .values({
    id: 'harvest-v1',
    kind: 'harvest',
    version: 1,
    hash,
    payload: harvestRule,
    active: true,
  })
  .onConflictDoNothing();

await db
  .insert(ruleVersions)
  .values({
    id: 'steal-v1',
    kind: 'steal',
    version: 1,
    hash: createHash('sha256').update(JSON.stringify(stealRule)).digest('hex'),
    payload: stealRule,
    active: true,
  })
  .onConflictDoNothing();

await sql.end();
console.log('Seeded crop catalog and rule versions.');
