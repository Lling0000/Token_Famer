import { createHash } from 'node:crypto';

import { and, eq, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { modelIdSchema } from '@token-farmer/contracts';
import type { Database } from '@token-farmer/db-runtime';
import {
  ledgerEntries,
  orders,
  paymentEvents,
  wallets,
} from '@token-farmer/db-runtime/internal/schema';

import { SANDBOX_USER_ID } from '../repositories/sandbox-account';
import { requireIdempotencyKey } from '../http/idempotency';
import { UNIFIED_CREDIT_ACCOUNT } from '../repositories/credit-wallet';

const orderSchema = z.object({
  skuId: z.enum(['starter', 'grower', 'estate']),
  modelId: modelIdSchema,
});

const skus = {
  starter: { tokenAmount: 100_000n, amountCents: 600n },
  grower: { tokenAmount: 500_000n, amountCents: 2_500n },
  estate: { tokenAmount: 2_000_000n, amountCents: 8_800n },
} as const;

const orderPayload = (order: typeof orders.$inferSelect) => ({
  id: order.id,
  merchantOrderNo: order.merchantOrderNo,
  skuId: order.skuId,
  modelId: order.modelId,
  tokenAmount: order.tokenAmount.toString(),
  amountCents: order.amountCents.toString(),
  status: order.status,
  paymentUrl: `/api/payments/mock/${order.id}/complete`,
});

// eslint-disable-next-line max-lines-per-function -- Keeps order creation and its idempotent sandbox callback adjacent.
export const registerPaymentRoutes = async (app: FastifyInstance, db: Database): Promise<void> => {
  app.get('/api/payments/orders', async () => {
    const rows = await db.select().from(orders).where(eq(orders.userId, SANDBOX_USER_ID));
    return { orders: rows.map(orderPayload) };
  });

  app.post('/api/payments/orders', async (request) => {
    const body = orderSchema.parse(request.body);
    const key = requireIdempotencyKey(request.headers);
    const digest = createHash('sha256').update(`${SANDBOX_USER_ID}:${key}`).digest('hex');
    const merchantOrderNo = `tf_${digest.slice(0, 24)}`;
    const existing = await db.query.orders.findFirst({
      where: eq(orders.merchantOrderNo, merchantOrderNo),
    });
    if (existing) return orderPayload(existing);
    const sku = skus[body.skuId];
    const inserted = await db
      .insert(orders)
      .values({
        merchantOrderNo,
        userId: SANDBOX_USER_ID,
        provider: 'mock',
        skuId: body.skuId,
        modelId: body.modelId,
        tokenAmount: sku.tokenAmount,
        amountCents: sku.amountCents,
      })
      .returning();
    const order = inserted[0];
    if (!order) throw new Error('Order insert failed');
    return orderPayload(order);
  });

  app.post<{ Params: { orderId: string } }>(
    '/api/payments/mock/:orderId/complete',
    async (request) => {
      requireIdempotencyKey(request.headers);
      return db.transaction(async (transaction) => {
        const order = await transaction.query.orders.findFirst({
          where: and(eq(orders.id, request.params.orderId), eq(orders.userId, SANDBOX_USER_ID)),
        });
        if (!order) throw new Error('Order was not found');
        if (order.status === 'credited') return { credited: true, replayed: true };
        if (order.status !== 'pending' && order.status !== 'paid')
          throw new Error('Order cannot be completed');
        const now = new Date();
        await transaction
          .insert(paymentEvents)
          .values({
            provider: 'mock',
            providerEventId: `mock:${order.id}`,
            orderId: order.id,
            signatureValid: true,
            payload: { sandbox: true },
          })
          .onConflictDoNothing();
        const updated = await transaction
          .update(wallets)
          .set({
            available: sql`${wallets.available} + ${order.tokenAmount}`,
            version: sql`${wallets.version} + 1`,
            updatedAt: now,
          })
          .where(and(eq(wallets.userId, order.userId), eq(wallets.modelId, UNIFIED_CREDIT_ACCOUNT)))
          .returning();
        const wallet = updated[0];
        if (!wallet) throw new Error('Wallet was not found');
        await transaction.insert(ledgerEntries).values({
          walletId: wallet.id,
          amount: order.tokenAmount,
          direction: 'credit',
          entryType: 'payment_credit',
          businessReference: `payment:${order.id}`,
          balanceAfter: wallet.available,
          metadata: { merchantOrderNo: order.merchantOrderNo, provider: 'mock' },
        });
        await transaction
          .update(orders)
          .set({ status: 'credited', paidAt: now, creditedAt: now })
          .where(eq(orders.id, order.id));
        return { credited: true, replayed: false, balance: wallet.available.toString() };
      });
    },
  );
};
