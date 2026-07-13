import { randomInt } from 'node:crypto';

import { and, eq, gte, or, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import type { Database } from '@token-farmer/db-runtime';
import {
  friendships,
  outboxEvents,
  plantings,
  stealAttempts,
  tokenPacks,
  users,
} from '@token-farmer/db-runtime/internal/schema';
import { quantity, utcInstant } from '@token-farmer/primitives';
import { calculateStealAttempt, DEFAULT_STEAL_RULES } from '@token-farmer/social';

import { SANDBOX_FRIEND_ID, SANDBOX_USER_ID } from '../repositories/sandbox-account';
import { requireIdempotencyKey } from '../http/idempotency';

const attemptPayload = (attempt: typeof stealAttempts.$inferSelect, replayed: boolean) => ({
  outcome: attempt.outcome,
  stolenFruit: attempt.fruitAmount,
  tokenPackId: attempt.tokenPackId,
  replayed,
});

// eslint-disable-next-line max-lines-per-function -- Exposes the friend read model and single atomic steal command together.
export const registerSocialRoutes = async (app: FastifyInstance, db: Database): Promise<void> => {
  app.get('/api/friends', async () => {
    const friend = await db.query.users.findFirst({ where: eq(users.id, SANDBOX_FRIEND_ID) });
    const crops = await db
      .select({ id: plantings.id })
      .from(plantings)
      .where(and(eq(plantings.ownerId, SANDBOX_FRIEND_ID), eq(plantings.state, 'mature')));
    if (!friend) return { friends: [] };
    return {
      friends: [
        {
          id: friend.id,
          name: friend.displayName,
          level: friend.level,
          intimacyLevel: 4,
          stealablePlantings: crops.map((crop) => crop.id),
        },
      ],
    };
  });

  app.post<{ Params: { friendId: string; plantingId: string } }>(
    '/api/friends/:friendId/plantings/:plantingId/steal',
    // eslint-disable-next-line max-lines-per-function -- Steal eligibility, outcome, reward, and outbox form one command.
    async (request) => {
      requireIdempotencyKey(request.headers);
      if (request.params.friendId !== SANDBOX_FRIEND_ID) throw new Error('Friend was not found');
      const now = new Date();
      // eslint-disable-next-line max-lines-per-function, complexity -- The documented steal invariant requires one locked transaction.
      return db.transaction(async (transaction) => {
        const lockedRows = await transaction
          .select()
          .from(plantings)
          .where(
            and(
              eq(plantings.id, request.params.plantingId),
              eq(plantings.ownerId, request.params.friendId),
              eq(plantings.state, 'mature'),
            ),
          )
          .for('update');
        const crop = lockedRows[0];
        if (!crop) throw new Error('Stealable crop was not found');
        const existing = await transaction.query.stealAttempts.findFirst({
          where: and(
            eq(stealAttempts.plantingId, crop.id),
            eq(stealAttempts.thiefId, SANDBOX_USER_ID),
          ),
        });
        if (existing) return attemptPayload(existing, true);
        const relationship = await transaction.query.friendships.findFirst({
          where: and(
            eq(friendships.status, 'accepted'),
            or(
              and(
                eq(friendships.userLowId, SANDBOX_USER_ID),
                eq(friendships.userHighId, request.params.friendId),
              ),
              and(
                eq(friendships.userHighId, SANDBOX_USER_ID),
                eq(friendships.userLowId, request.params.friendId),
              ),
            ),
          ),
        });
        const owner = await transaction.query.users.findFirst({
          where: eq(users.id, request.params.friendId),
        });
        if (!relationship?.acceptedAt || !owner)
          throw new Error('Accepted friendship was not found');
        const startOfDay = new Date(now);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const today = await transaction
          .select({ id: stealAttempts.id })
          .from(stealAttempts)
          .where(
            and(
              eq(stealAttempts.thiefId, SANDBOX_USER_ID),
              gte(stealAttempts.createdAt, startOfDay),
            ),
          );
        const result = calculateStealAttempt({
          currentTime: utcInstant(now.toISOString()),
          ownerProtectionStartedAt: utcInstant(owner.createdAt.toISOString()),
          attackerProtectionStartedAt: utcInstant('2025-01-01T00:00:00.000Z'),
          relationship: {
            accepted: true,
            acceptedAt: utcInstant(relationship.acceptedAt.toISOString()),
            intimacyLevel: Math.min(5, Math.floor(relationship.intimacyPoints / 100)),
            attackerAttemptsToday: today.length,
          },
          crop: {
            fruitNumber: quantity(crop.fruitNum),
            leftFruitNumber: quantity(crop.leftFruitNum),
            stolenNumber: quantity(crop.stoleNum),
            maximumStealableFruit: quantity(crop.maxStealableFruit),
            maturedAt: utcInstant(crop.matureAt.toISOString()),
            stealable: true,
            alreadyAttempted: false,
          },
          guard: { activeUntil: utcInstant('2030-01-01T00:00:00.000Z') },
          random: {
            guardBasisPoints: randomInt(10_000),
            successBasisPoints: randomInt(10_000),
            amountBasisPoints: randomInt(10_000),
          },
          rules: DEFAULT_STEAL_RULES,
        });
        if (!result.attempted)
          return { outcome: result.reason, stolenFruit: 0, tokenPackId: null, replayed: false };
        const stolenFruit = Number(result.stolenFruit);
        const tokenAmount =
          crop.fruitNum > 0 ? (crop.seedCost * result.stolenFruit) / BigInt(crop.fruitNum) : 0n;
        let tokenPackId: string | null = null;
        if (result.outcome === 'stolen' && stolenFruit > 0) {
          const packs = await transaction
            .insert(tokenPacks)
            .values({
              userId: SANDBOX_USER_ID,
              modelId: crop.modelId,
              amount: tokenAmount,
              source: 'steal',
              sourceReference: `steal:${crop.id}:${SANDBOX_USER_ID}`,
              metadata: {
                ownerId: crop.ownerId,
                fruitAmount: stolenFruit,
                ruleVersion: DEFAULT_STEAL_RULES.version,
              },
            })
            .returning({ id: tokenPacks.id });
          tokenPackId = packs[0]?.id ?? null;
          await transaction
            .update(plantings)
            .set({
              leftFruitNum: sql`${plantings.leftFruitNum} - ${stolenFruit}`,
              stoleNum: sql`${plantings.stoleNum} + ${stolenFruit}`,
            })
            .where(eq(plantings.id, crop.id));
        }
        const attempts = await transaction
          .insert(stealAttempts)
          .values({
            plantingId: crop.id,
            ownerId: crop.ownerId,
            thiefId: SANDBOX_USER_ID,
            success: result.outcome === 'stolen',
            outcome: result.outcome,
            fruitAmount: stolenFruit,
            tokenPackId,
            ruleVersionId: 'steal-v1',
          })
          .returning();
        const attempt = attempts[0];
        if (!attempt) throw new Error('Steal attempt insert failed');
        await transaction.insert(outboxEvents).values({
          topic: 'social.steal-attempted.v1',
          aggregateId: crop.id,
          payload: { attemptId: attempt.id, outcome: result.outcome, fruitAmount: stolenFruit },
        });
        return attemptPayload(attempt, false);
      });
    },
  );
};
