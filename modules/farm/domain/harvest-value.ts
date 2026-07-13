import {
  DomainInvariantError,
  multiplyByRatio,
  ratio,
  subtractTokenAmounts,
  type Quantity,
  type TokenAmount,
} from '@token-farmer/primitives';

export interface HarvestValueSnapshot {
  readonly grossTokenAmount: TokenAmount;
  readonly fruitNumber: Quantity;
}

export function calculateCumulativeStolenValue(
  harvest: HarvestValueSnapshot,
  stolenFruit: Quantity,
): TokenAmount {
  if (harvest.fruitNumber === 0n || stolenFruit > harvest.fruitNumber) {
    throw new DomainInvariantError(
      'INVALID_HARVEST_VALUE',
      'Stolen fruit must fit a non-empty harvest',
    );
  }
  return multiplyByRatio(harvest.grossTokenAmount, ratio(stolenFruit, harvest.fruitNumber));
}

export function calculateStealBatchValue(
  harvest: HarvestValueSnapshot,
  stolenBefore: Quantity,
  stolenAfter: Quantity,
): TokenAmount {
  if (stolenAfter < stolenBefore) {
    throw new DomainInvariantError('INVALID_STEAL_RANGE', 'Stolen fruit cannot decrease');
  }
  return subtractTokenAmounts(
    calculateCumulativeStolenValue(harvest, stolenAfter),
    calculateCumulativeStolenValue(harvest, stolenBefore),
  );
}

export function calculateOwnerHarvestValue(
  harvest: HarvestValueSnapshot,
  stolenFruit: Quantity,
): TokenAmount {
  return subtractTokenAmounts(
    harvest.grossTokenAmount,
    calculateCumulativeStolenValue(harvest, stolenFruit),
  );
}
