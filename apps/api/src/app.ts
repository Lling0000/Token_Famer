import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { createDatabase } from '@token-farmer/db-runtime';

import type { AppConfig } from './config';
import { ensureSandboxAccount } from './repositories/sandbox-account';
import { ensureSandboxInvitation, registerAuthRoutes } from './routes/auth';
import { registerGameRoutes } from './routes/game';
import { registerGatewayRoutes } from './routes/gateway';
import { registerKeyRoutes } from './routes/keys';
import { registerLeaderboardRoutes } from './routes/leaderboards';
import { registerPaymentRoutes } from './routes/payments';
import { registerSocialRoutes } from './routes/social';
import { registerSocialCareRoutes } from './routes/social-care';

const statusForError = (error: Error): number => {
  if (error instanceof ZodError) return 400;
  if (/Bearer API key/.test(error.message)) return 401;
  if (/Email or password|Two-factor code/.test(error.message)) return 401;
  if (/not allowed/.test(error.message)) return 403;
  if (/not found|missing/.test(error.message)) return 404;
  if (/Insufficient|not available|not mature|cannot|already/.test(error.message)) return 409;
  if (/Idempotency-Key|valid|at most/.test(error.message)) return 400;
  return 500;
};

const codeForStatus = (status: number): string => {
  if (status === 400) return 'INVALID_REQUEST';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  return 'INTERNAL_ERROR';
};

export const buildApp = async (config: AppConfig): Promise<FastifyInstance> => {
  const app = Fastify({ logger: true, requestIdHeader: 'x-request-id' });
  const connection = createDatabase(config.DATABASE_URL);
  await app.register(cors, { origin: config.CORS_ORIGIN, credentials: true });
  await app.register(rateLimit, { max: 180, timeWindow: '1 minute' });
  await app.register(sensible);

  app.get('/health/live', async () => ({ status: 'ok' }));
  app.get('/health/ready', async () => {
    await connection.sql`select 1`;
    return { status: 'ready', upstream: config.UPSTREAM_MODE };
  });

  await registerGameRoutes(app, connection.db, config);
  await registerAuthRoutes(app, connection.db, config);
  await registerKeyRoutes(app, connection.db, config);
  await registerLeaderboardRoutes(app);
  await registerPaymentRoutes(app, connection.db);
  await registerSocialRoutes(app, connection.db);
  await registerSocialCareRoutes(app, connection.db);
  await registerGatewayRoutes(app, connection.db, config);

  app.addHook('onReady', async () => {
    await ensureSandboxAccount(connection.db);
    await ensureSandboxInvitation(connection.db, config);
  });
  app.addHook('onClose', async () => {
    await connection.sql.end({ timeout: 5 });
  });
  app.setErrorHandler((unknownError, request, reply) => {
    const error = unknownError instanceof Error ? unknownError : new Error('Unexpected error');
    const status = statusForError(error);
    if (status === 500) request.log.error({ err: error }, 'request failed');
    void reply.status(status).send({
      error: {
        code: codeForStatus(status),
        message: status === 500 ? 'The service could not complete the request' : error.message,
        requestId: request.id,
        ...(error instanceof ZodError ? { details: { issues: error.issues } } : {}),
      },
    });
  });
  return app;
};
