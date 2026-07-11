import type { EntityId } from '@token-farmer/primitives';

import type { StealAttemptResult, StealRandomSamples } from '../domain/calculate-steal-attempt';

export interface ExecuteStealInput {
  readonly plantingId: EntityId;
  readonly attackerId: EntityId;
  readonly idempotencyKey: string;
  readonly random: StealRandomSamples;
}

export interface StealService {
  execute(input: ExecuteStealInput): Promise<StealAttemptResult & { readonly replayed: boolean }>;
}
