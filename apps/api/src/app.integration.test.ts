import { randomUUID } from 'node:crypto';

import { and, eq, inArray } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDatabase, type Database } from '@token-farmer/db-runtime';
import {
  cropEvents,
  plantings,
  plots,
  stealAttempts,
  tokenPacks,
  wallets,
} from '@token-farmer/db-runtime/internal/schema';

import { buildApp } from './app';
import { loadConfig } from './config';
import { UNIFIED_CREDIT_ACCOUNT } from './repositories/credit-wallet';
import { releaseUsage, reserveUsage } from './repositories/gateway-actions';
import { SANDBOX_FRIEND_ID, SANDBOX_USER_ID } from './repositories/sandbox-account';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://token_farmer:token_farmer@127.0.0.1:5433/token_farmer';

const testConfig = loadConfig({
  NODE_ENV: 'test',
  DATABASE_URL: databaseUrl,
  CORS_ORIGIN: 'http://127.0.0.1:3000',
  BETTER_AUTH_SECRET: 'integration-auth-secret-at-least-32-characters',
  API_KEY_PEPPER: 'integration-api-pepper-at-least-32-characters',
  FIELD_ENCRYPTION_KEY: 'integration-encryption-key-at-least-32-characters',
  UPSTREAM_MODE: 'mock',
  TEAMOROUTER_RESALE_APPROVED: 'false',
  GAME_TIME_SCALE: '60',
});

describe('Token Farmer database workflows', () => {
  let app: FastifyInstance;
  let database: ReturnType<typeof createDatabase>;

  beforeAll(async () => {
    database = createDatabase(databaseUrl);
    app = await buildApp(testConfig);
    await app.ready();
    await resetFriendFixtures(database.db);
  });

  afterAll(async () => {
    await app.close();
    await database.sql.end({ timeout: 5 });
  });

  it('runs a concurrent free-seed harvest and activation exactly once', async () => {
    const before = await bootstrap(app);
    const plot = before.plots.find((candidate: { state: string }) => candidate.state === 'empty');
    if (!plot) throw new Error('No empty sandbox plot is available');
    const plantKey = `free-plant-${randomUUID()}`;
    const plants = await Promise.all([
      plant(app, plot.id, plantKey),
      plant(app, plot.id, plantKey),
    ]);
    expect(plants[0].statusCode).toBe(200);
    expect(plants[1].statusCode).toBe(200);
    expect(plants[0].json().plantingId).toBe(plants[1].json().plantingId);

    await new Promise((resolve) => setTimeout(resolve, 1_150));
    const matured = await bootstrap(app);
    expect(matured.plots.find((candidate: { id: string }) => candidate.id === plot.id)?.state).toBe(
      'mature',
    );

    const harvests = await Promise.all([
      harvest(app, plot.id, `harvest-a-${randomUUID()}`),
      harvest(app, plot.id, `harvest-b-${randomUUID()}`),
    ]);
    expect(harvests.every((response) => response.statusCode === 200)).toBe(true);
    const firstHarvest = harvests[0].json<{ tokenPackId: string; amount: string }>();
    expect(firstHarvest.amount).toBe('100');
    expect(harvests[1].json().tokenPackId).toBe(firstHarvest.tokenPackId);

    const activations = await Promise.all([
      activate(app, firstHarvest.tokenPackId, `activate-a-${randomUUID()}`),
      activate(app, firstHarvest.tokenPackId, `activate-b-${randomUUID()}`),
    ]);
    expect(activations.every((response) => response.statusCode === 200)).toBe(true);
    const after = await bootstrap(app);
    expect(BigInt(after.creditBalance) - BigInt(before.creditBalance)).toBe(100n);
    expect(BigInt(after.creditBalance)).toBeGreaterThanOrEqual(0n);

    const cleared = await app.inject({
      method: 'POST',
      url: `/api/plots/${plot.id}/clear`,
      headers: { 'idempotency-key': `clear-${randomUUID()}` },
    });
    expect(cleared.statusCode).toBe(200);
  });

  it('keeps friend care, prank, and steal retries idempotent', async () => {
    const fixtures = await friendPlantings(database.db);
    const helpKey = `help-${randomUUID()}`;
    const helped = await friendCommand(app, fixtures.growingId, 'help', helpKey, {
      action: 'weed',
    });
    const helpReplay = await friendCommand(app, fixtures.growingId, 'help', helpKey, {
      action: 'weed',
    });
    expect(helped.json()).toMatchObject({ helped: true, replayed: false, intimacyAdded: 2 });
    expect(helpReplay.json()).toMatchObject({ helped: false, replayed: true });

    const prankKey = `prank-${randomUUID()}`;
    const pranked = await friendCommand(app, fixtures.growingId, 'prank', prankKey);
    const prankReplay = await friendCommand(app, fixtures.growingId, 'prank', prankKey);
    expect(pranked.json()).toMatchObject({ pranked: true, replayed: false, delayedSeconds: 60 });
    expect(prankReplay.json()).toMatchObject({ pranked: true, replayed: true, delayedSeconds: 60 });

    const steals = await Promise.all([
      friendCommand(app, fixtures.matureId, 'steal', `steal-a-${randomUUID()}`),
      friendCommand(app, fixtures.matureId, 'steal', `steal-b-${randomUUID()}`),
    ]);
    expect(steals.every((response) => response.statusCode === 200)).toBe(true);
    const outcomes = steals.map((response) => response.json());
    expect(outcomes.filter((outcome) => outcome.replayed === false)).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.replayed === true)).toHaveLength(1);
    expect(outcomes[0].outcome).toBe(outcomes[1].outcome);
    expect(outcomes[0].stolenFruit).toBe(outcomes[1].stolenFruit);
  });

  it('holds API budget before an upstream call and releases it on failure', async () => {
    const before = await creditWallet(database.db);
    const reservation = await reserveUsage(database.db, {
      requestId: `release-${randomUUID()}`,
      apiKey: {
        id: '00000000-0000-4000-8000-000000000099',
        userId: SANDBOX_USER_ID,
        allowedModels: ['gpt-5.4-mini'],
      },
      modelId: 'gpt-5.4-mini',
      maximumInputTokens: 100n,
      maximumOutputTokens: 200n,
      now: new Date(),
    });
    const held = await creditWallet(database.db);
    expect(before.available - held.available).toBe(reservation.heldTokens);
    expect(held.reserved - before.reserved).toBe(reservation.heldTokens);
    await releaseUsage(database.db, reservation, new Date());
    const released = await creditWallet(database.db);
    expect(released.available).toBe(before.available);
    expect(released.reserved).toBe(before.reserved);
  });
});

const bootstrap = async (app: FastifyInstance) => {
  const response = await app.inject({ method: 'GET', url: '/api/bootstrap' });
  expect(response.statusCode).toBe(200);
  return response.json();
};

const plant = (app: FastifyInstance, plotId: string, key: string) =>
  app.inject({
    method: 'POST',
    url: `/api/plots/${plotId}/plant`,
    headers: { 'idempotency-key': key },
    payload: { cropLevel: 0, modelId: 'gpt-5.6-luna' },
  });

const harvest = (app: FastifyInstance, plotId: string, key: string) =>
  app.inject({
    method: 'POST',
    url: `/api/plots/${plotId}/harvest`,
    headers: { 'idempotency-key': key },
  });

const activate = (app: FastifyInstance, packId: string, key: string) =>
  app.inject({
    method: 'POST',
    url: `/api/token-packs/${packId}/activate`,
    headers: { 'idempotency-key': key },
  });

const friendCommand = (
  app: FastifyInstance,
  plantingId: string,
  command: 'help' | 'prank' | 'steal',
  key: string,
  payload?: Record<string, string>,
) =>
  app.inject({
    method: 'POST',
    url: `/api/friends/${SANDBOX_FRIEND_ID}/plantings/${plantingId}/${command}`,
    headers: { 'idempotency-key': key },
    ...(payload ? { payload } : {}),
  });

const friendPlantings = async (db: Database) => {
  const rows = await db
    .select({ id: plantings.id, reference: plantings.businessReference })
    .from(plantings)
    .where(eq(plantings.ownerId, SANDBOX_FRIEND_ID));
  const matureId = rows.find((row) => row.reference === 'sandbox-friend-mature-v1')?.id;
  const growingId = rows.find((row) => row.reference === 'sandbox-friend-growing-v1')?.id;
  if (!matureId || !growingId) throw new Error('Friend fixtures are missing');
  return { matureId, growingId };
};

const resetFriendFixtures = async (db: Database): Promise<void> => {
  const fixtures = await friendPlantings(db);
  const attempts = await db
    .select({ tokenPackId: stealAttempts.tokenPackId })
    .from(stealAttempts)
    .where(eq(stealAttempts.plantingId, fixtures.matureId));
  await db.delete(stealAttempts).where(eq(stealAttempts.plantingId, fixtures.matureId));
  const packIds = attempts.flatMap((attempt) => (attempt.tokenPackId ? [attempt.tokenPackId] : []));
  if (packIds.length > 0) await db.delete(tokenPacks).where(inArray(tokenPacks.id, packIds));
  await db
    .update(plantings)
    .set({ leftFruitNum: 20, stoleNum: 0, state: 'mature' })
    .where(eq(plantings.id, fixtures.matureId));
  await db
    .delete(cropEvents)
    .where(and(eq(cropEvents.plantingId, fixtures.growingId), eq(cropEvents.type, 'prank')));
  await db
    .update(cropEvents)
    .set({ state: 'active', resolvedAt: null })
    .where(and(eq(cropEvents.plantingId, fixtures.growingId), eq(cropEvents.type, 'weed')));
  await db
    .update(plantings)
    .set({ state: 'growing', matureAt: new Date('2030-01-01T00:00:00.000Z') })
    .where(eq(plantings.id, fixtures.growingId));
  const growing = await db.query.plantings.findFirst({
    where: eq(plantings.id, fixtures.growingId),
  });
  if (growing) await db.update(plots).set({ state: 'growing' }).where(eq(plots.id, growing.plotId));
};

const creditWallet = async (db: Database) => {
  const wallet = await db.query.wallets.findFirst({
    where: and(eq(wallets.userId, SANDBOX_USER_ID), eq(wallets.modelId, UNIFIED_CREDIT_ACCOUNT)),
  });
  if (!wallet) throw new Error('Unified credit wallet is missing');
  return wallet;
};
