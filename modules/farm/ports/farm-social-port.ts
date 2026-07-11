import type { EntityId, Quantity, UtcInstant } from '@token-farmer/primitives';

export interface LockedMatureCrop {
  readonly plantingId: EntityId;
  readonly ownerId: EntityId;
  readonly modelId: string;
  readonly fruitNumber: Quantity;
  readonly leftFruitNumber: Quantity;
  readonly stolenNumber: Quantity;
  readonly maximumStealableFruit: Quantity;
  readonly maturedAt: UtcInstant;
  readonly stealable: boolean;
  readonly revision: bigint;
}

export interface ApplyStealInput {
  readonly plantingId: EntityId;
  readonly expectedRevision: bigint;
  readonly stolenFruit: Quantity;
}

export interface FarmSocialPort {
  lockMatureCrop(plantingId: EntityId): Promise<LockedMatureCrop | undefined>;
  applySteal(input: ApplyStealInput): Promise<void>;
}
