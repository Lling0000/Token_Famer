import type { FastifyInstance } from 'fastify';

import { maintainRequestSchema, plantRequestSchema } from '@token-farmer/contracts';
import type { Database } from '@token-farmer/db-runtime';

import type { AppConfig } from '../config';
import { requireIdempotencyKey } from '../http/idempotency';
import { clearPlot, harvestPlot, plantPlot } from '../repositories/farm-actions';
import { loadBootstrap } from '../repositories/farm-state';
import { SANDBOX_USER_ID } from '../repositories/sandbox-account';
import { activateTokenPack } from '../repositories/wallet-actions';

// eslint-disable-next-line max-lines-per-function -- Registers the compact farm command surface as one HTTP boundary.
export const registerGameRoutes = async (
  app: FastifyInstance,
  db: Database,
  config: AppConfig,
): Promise<void> => {
  app.get('/api/bootstrap', async () => loadBootstrap(db, SANDBOX_USER_ID, new Date()));

  app.post<{ Params: { plotId: string } }>('/api/plots/:plotId/plant', async (request) => {
    const body = plantRequestSchema.parse(request.body);
    const result = await plantPlot(db, config, {
      userId: SANDBOX_USER_ID,
      plotId: request.params.plotId,
      cropLevel: body.cropLevel,
      modelId: body.modelId,
      idempotencyKey: requireIdempotencyKey(request.headers),
      now: new Date(),
    });
    return { plantingId: result.plantingId, matureAt: result.matureAt.toISOString() };
  });

  app.post<{ Params: { plotId: string } }>('/api/plots/:plotId/harvest', async (request) => {
    requireIdempotencyKey(request.headers);
    const result = await harvestPlot(
      db,
      config,
      SANDBOX_USER_ID,
      request.params.plotId,
      new Date(),
    );
    return {
      tokenPackId: result.tokenPackId,
      amount: result.amount.toString(),
      randomSeedReveal: result.reveal,
    };
  });

  app.post<{ Params: { plotId: string } }>('/api/plots/:plotId/clear', async (request) => {
    requireIdempotencyKey(request.headers);
    await clearPlot(db, SANDBOX_USER_ID, request.params.plotId, new Date());
    return { cleared: true };
  });

  app.post<{ Params: { plotId: string } }>('/api/plots/:plotId/maintain', async (request) => {
    requireIdempotencyKey(request.headers);
    const body = maintainRequestSchema.parse(request.body);
    return {
      action: body.action,
      success: body.action === 'water' || body.action === 'guaranteed' || randomSuccess(),
    };
  });

  app.post<{ Params: { packId: string } }>('/api/token-packs/:packId/activate', async (request) => {
    requireIdempotencyKey(request.headers);
    const result = await activateTokenPack(db, SANDBOX_USER_ID, request.params.packId, new Date());
    return { amount: result.amount.toString(), balance: result.balance.toString() };
  });
};

const randomSuccess = (): boolean => {
  const value = crypto.getRandomValues(new Uint16Array(1))[0] ?? 0;
  return value % 10_000 < 7_000;
};
