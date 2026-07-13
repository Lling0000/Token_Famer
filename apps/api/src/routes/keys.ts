import { and, eq, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { modelIdSchema } from '@token-farmer/contracts';
import type { Database } from '@token-farmer/db-runtime';
import { apiKeys } from '@token-farmer/db-runtime/internal/schema';

import type { AppConfig } from '../config';
import { SANDBOX_USER_ID } from '../repositories/sandbox-account';
import { createApiKey } from '../security';
import { requireIdempotencyKey } from '../http/idempotency';

const createKeySchema = z.object({
  name: z.string().min(1).max(80),
  allowedModels: z.array(modelIdSchema).min(1).max(20),
});

// eslint-disable-next-line max-lines-per-function -- Keeps API key lifecycle routes together for one-time reveal review.
export const registerKeyRoutes = async (
  app: FastifyInstance,
  db: Database,
  config: AppConfig,
): Promise<void> => {
  app.get('/api/keys', async () => {
    const rows = await db.select().from(apiKeys).where(eq(apiKeys.userId, SANDBOX_USER_ID));
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      prefix: row.prefix,
      allowedModels: row.allowedModels,
      createdAt: row.createdAt.toISOString(),
      lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
      revokedAt: row.revokedAt?.toISOString() ?? null,
    }));
  });

  app.post('/api/keys', async (request) => {
    requireIdempotencyKey(request.headers);
    const body = createKeySchema.parse(request.body);
    const active = await db
      .select({ id: apiKeys.id })
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, SANDBOX_USER_ID), isNull(apiKeys.revokedAt)));
    if (active.length >= 5) throw new Error('At most five active API keys are allowed');
    const generated = createApiKey(config.API_KEY_PEPPER);
    const inserted = await db
      .insert(apiKeys)
      .values({
        userId: SANDBOX_USER_ID,
        name: body.name,
        prefix: generated.prefix,
        secretHash: generated.hash,
        allowedModels: body.allowedModels,
      })
      .returning({ id: apiKeys.id, createdAt: apiKeys.createdAt });
    const key = inserted[0];
    if (!key) throw new Error('API key insert failed');
    return {
      id: key.id,
      value: generated.value,
      prefix: generated.prefix,
      createdAt: key.createdAt.toISOString(),
    };
  });

  app.delete<{ Params: { keyId: string } }>('/api/keys/:keyId', async (request) => {
    requireIdempotencyKey(request.headers);
    const revoked = await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(apiKeys.id, request.params.keyId),
          eq(apiKeys.userId, SANDBOX_USER_ID),
          isNull(apiKeys.revokedAt),
        ),
      )
      .returning({ id: apiKeys.id });
    if (revoked.length === 0) throw new Error('API key is missing or already revoked');
    return { revoked: true };
  });
};
