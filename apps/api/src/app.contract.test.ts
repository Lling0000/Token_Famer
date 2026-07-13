import { randomUUID } from 'node:crypto';

import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from './app';
import { createTotpCode } from './auth-crypto';
import { loadConfig } from './config';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://token_farmer:token_farmer@127.0.0.1:5433/token_farmer';

const testConfig = loadConfig({
  NODE_ENV: 'test',
  DATABASE_URL: databaseUrl,
  CORS_ORIGIN: 'http://127.0.0.1:3000',
  BETTER_AUTH_SECRET: 'contract-auth-secret-at-least-32-characters',
  API_KEY_PEPPER: 'contract-api-pepper-at-least-32-characters',
  FIELD_ENCRYPTION_KEY: 'contract-encryption-key-at-least-32-characters',
  UPSTREAM_MODE: 'mock',
  TEAMOROUTER_RESALE_APPROVED: 'false',
  GAME_TIME_SCALE: '60',
});

describe('Token Farmer HTTP contracts', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(testConfig);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns a 24-plot bootstrap with decimal-string wallets', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/bootstrap' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.plots).toHaveLength(24);
    expect(body.models).toHaveLength(20);
    expect(body.creditBalance).toMatch(/^\d+$/);
    expect(body.models.every((modelId: string) => typeof modelId === 'string')).toBe(true);
  });

  it('creates a one-time API key and charges a mock compatible request', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/keys',
      headers: { 'idempotency-key': `key-${randomUUID()}` },
      payload: { name: 'Contract key', allowedModels: ['gpt-5.4-mini'] },
    });
    expect(created.statusCode).toBe(200);
    const key = created.json<{ id: string; value: string }>();
    expect(key.value).toMatch(/^sk-tf-/);
    const completion = await app.inject({
      method: 'POST',
      url: '/v1/chat/completions',
      headers: { authorization: `Bearer ${key.value}` },
      payload: { model: 'gpt-5.4-mini', messages: [{ role: 'user', content: 'contract test' }] },
    });
    expect(completion.statusCode).toBe(200);
    expect(completion.json().token_farmer.charged_tokens).toMatch(/^\d+$/);
    const revoked = await app.inject({
      method: 'DELETE',
      url: `/api/keys/${key.id}`,
      headers: { 'idempotency-key': `revoke-${randomUUID()}` },
    });
    expect(revoked.statusCode).toBe(200);
  });

  it('credits ten repeated sandbox callbacks exactly once', async () => {
    const before = await walletBalance(app, 'gpt-5.4-mini');
    const orderResponse = await app.inject({
      method: 'POST',
      url: '/api/payments/orders',
      headers: { 'idempotency-key': `order-${randomUUID()}` },
      payload: { skuId: 'starter', modelId: 'gpt-5.4-mini' },
    });
    expect(orderResponse.statusCode).toBe(200);
    const order = orderResponse.json<{ id: string }>();
    for (let index = 0; index < 10; index += 1) {
      const callback = await app.inject({
        method: 'POST',
        url: `/api/payments/mock/${order.id}/complete`,
        headers: { 'idempotency-key': `callback-${order.id}-${index}` },
        payload: {},
      });
      expect(callback.statusCode).toBe(200);
    }
    const after = await walletBalance(app, 'gpt-5.4-mini');
    expect(after - before).toBe(100_000n);
  });

  it('completes invited registration, verification, 2FA login, session restore and logout', async () => {
    const email = `farmer-${randomUUID()}@example.com`;
    const password = 'Farm-Password-2026!';
    const registered = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      headers: { 'idempotency-key': `register-${randomUUID()}` },
      payload: { inviteCode: 'TOKEN-FARMER-ALPHA', email, displayName: '契约农场主', password },
    });
    expect(registered.statusCode).toBe(200);
    const registration = registered.json<{
      totpUri: string;
      sandboxVerificationCode: string;
    }>();
    expect(registration.sandboxVerificationCode).toMatch(/^\d{6}$/);

    const verified = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-email',
      headers: { 'idempotency-key': `verify-${randomUUID()}` },
      payload: { email, code: registration.sandboxVerificationCode },
    });
    expect(verified.statusCode).toBe(200);
    const secret = new URL(registration.totpUri).searchParams.get('secret');
    expect(secret).toBeTruthy();
    const login = await loginWithTotp(app, email, password, secret!);
    expect(login.body.firstLoginGrant).toBe(true);

    const session = await app.inject({
      method: 'GET',
      url: '/api/auth/session',
      headers: { cookie: login.cookie },
    });
    expect(session.statusCode).toBe(200);
    expect(session.json().displayName).toBe('契约农场主');

    const secondLogin = await loginWithTotp(app, email, password, secret!);
    expect(secondLogin.body.firstLoginGrant).toBe(false);
    const logout = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: login.cookie, 'idempotency-key': `logout-${randomUUID()}` },
    });
    expect(logout.statusCode).toBe(200);
    const expired = await app.inject({
      method: 'GET',
      url: '/api/auth/session',
      headers: { cookie: login.cookie },
    });
    expect(expired.statusCode).toBe(401);
  });
});

const loginWithTotp = async (
  app: FastifyInstance,
  email: string,
  password: string,
  secret: string,
) => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    headers: { 'idempotency-key': `login-${randomUUID()}` },
    payload: { email, password, totp: createTotpCode(secret, new Date()) },
  });
  expect(response.statusCode).toBe(200);
  const cookie = response.headers['set-cookie'];
  expect(cookie).toContain('tf_session=');
  return { body: response.json<{ firstLoginGrant: boolean }>(), cookie: cookie! };
};

const walletBalance = async (app: FastifyInstance, modelId: string): Promise<bigint> => {
  const response = await app.inject({ method: 'GET', url: '/api/bootstrap' });
  const body = response.json();
  if (!body.models.includes(modelId)) {
    throw new Error('Requested model is missing from the catalog');
  }
  return BigInt(body.creditBalance);
};
