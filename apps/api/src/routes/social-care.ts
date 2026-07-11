import { and, eq, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { Database, DatabaseTransaction } from '@token-farmer/db-runtime';
import {
  cropEvents,
  friendships,
  outboxEvents,
  plantings,
} from '@token-farmer/db-runtime/internal/schema';

import { requireIdempotencyKey } from '../http/idempotency';
import { SANDBOX_FRIEND_ID, SANDBOX_USER_ID } from '../repositories/sandbox-account';

const helpSchema = z.object({ action: z.enum(['dry', 'weed', 'pest']) });
type FriendParams = { friendId: string; plantingId: string };

// eslint-disable-next-line max-lines-per-function -- Friend help and prank commands share the same guarded crop boundary.
export const registerSocialCareRoutes = async (
  app: FastifyInstance,
  db: Database,
): Promise<void> => {
  app.post<{ Params: FriendParams }>(
    '/api/friends/:friendId/plantings/:plantingId/help',
    async (request) => {
      requireIdempotencyKey(request.headers);
      const body = helpSchema.parse(request.body);
      return db.transaction(async (transaction) => {
        const crop = await lockFriendCrop(transaction, request.params);
        const event = await transaction.query.cropEvents.findFirst({
          where: and(
            eq(cropEvents.plantingId, crop.id),
            eq(cropEvents.type, body.action),
            eq(cropEvents.state, 'active'),
          ),
        });
        if (!event) return { helped: false, replayed: true };
        await transaction
          .update(cropEvents)
          .set({ state: 'resolved', resolvedAt: new Date() })
          .where(and(eq(cropEvents.id, event.id), eq(cropEvents.state, 'active')));
        await transaction
          .update(friendships)
          .set({
            intimacyPoints: sql`${friendships.intimacyPoints} + 2`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(friendships.userLowId, SANDBOX_USER_ID),
              eq(friendships.userHighId, SANDBOX_FRIEND_ID),
            ),
          );
        await transaction.insert(outboxEvents).values({
          topic: 'social.crop-helped.v1',
          aggregateId: crop.id,
          payload: { helperId: SANDBOX_USER_ID, eventId: event.id, action: body.action },
        });
        return { helped: true, replayed: false, intimacyAdded: 2 };
      });
    },
  );

  app.post<{ Params: FriendParams }>(
    '/api/friends/:friendId/plantings/:plantingId/prank',
    async (request) => {
      requireIdempotencyKey(request.headers);
      return db.transaction(async (transaction) => {
        const crop = await lockFriendCrop(transaction, request.params);
        const friendship = await transaction.query.friendships.findFirst({
          where: and(
            eq(friendships.userLowId, SANDBOX_USER_ID),
            eq(friendships.userHighId, SANDBOX_FRIEND_ID),
            eq(friendships.status, 'accepted'),
          ),
        });
        if (!friendship?.pranksAllowed) throw new Error('Friend pranks are disabled');
        if (crop.state !== 'growing') throw new Error('Only growing crops can be pranked');
        const existing = await transaction.query.cropEvents.findFirst({
          where: and(
            eq(cropEvents.plantingId, crop.id),
            eq(cropEvents.type, 'prank'),
            eq(cropEvents.state, 'active'),
          ),
        });
        if (existing) return { pranked: true, replayed: true, delayedSeconds: 60 };
        await transaction
          .update(plantings)
          .set({
            matureAt: new Date(crop.matureAt.getTime() + 60_000),
          })
          .where(eq(plantings.id, crop.id));
        await transaction.insert(cropEvents).values({ plantingId: crop.id, type: 'prank' });
        await transaction.insert(outboxEvents).values({
          topic: 'social.crop-pranked.v1',
          aggregateId: crop.id,
          payload: { pranksterId: SANDBOX_USER_ID, delayedSeconds: 60 },
        });
        return { pranked: true, replayed: false, delayedSeconds: 60 };
      });
    },
  );
};

const lockFriendCrop = async (db: DatabaseTransaction, params: FriendParams) => {
  if (params.friendId !== SANDBOX_FRIEND_ID) throw new Error('Friend was not found');
  const rows = await db
    .select()
    .from(plantings)
    .where(and(eq(plantings.id, params.plantingId), eq(plantings.ownerId, params.friendId)))
    .for('update');
  const crop = rows[0];
  if (!crop) throw new Error('Friend crop was not found');
  return crop;
};
