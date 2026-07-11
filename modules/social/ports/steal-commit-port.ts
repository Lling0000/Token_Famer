import type { EntityId, Quantity, UtcInstant } from '@token-farmer/primitives';

export interface StealCommitInput {
  readonly plantingId: EntityId;
  readonly attackerId: EntityId;
  readonly expectedCropRevision: bigint;
  readonly stolenFruit: Quantity;
  readonly idempotencyKey: string;
  readonly occurredAt: UtcInstant;
}

export interface StealCommitResult {
  readonly replayed: boolean;
  readonly stealRecordId: EntityId;
}

/** Implemented by the composition layer as one farm, wallet, record, and outbox transaction. */
export interface StealCommitPort {
  commit(input: StealCommitInput): Promise<StealCommitResult>;
}
