import {
  DomainInvariantError,
  isAtOrAfter,
  multiplyByRatios,
  multiplyIntegerByRatios,
  quantity,
  type Quantity,
  type Ratio,
  type TokenAmount,
  type UtcInstant,
} from '@token-farmer/primitives';

import type {
  CropRuleVersion,
  HarvestOutcomeKey,
  HarvestOutcomeRule,
  HarvestRuleVersion,
} from './farm-rules';

export interface CalculateHarvestInput {
  readonly crop: CropRuleVersion;
  readonly yieldRate: Ratio;
  readonly maturedAt: UtcInstant;
  readonly currentTime: UtcInstant;
  readonly unresolvedPestEvents: number;
  readonly randomBasisPoints: number;
  readonly rules: HarvestRuleVersion;
}

export type HarvestResult =
  | { readonly harvestable: false; readonly reason: 'not_mature' }
  | {
      readonly harvestable: true;
      readonly cropRuleVersion: string;
      readonly harvestRuleVersion: string;
      readonly outcome: HarvestOutcomeKey;
      readonly fruitNumber: Quantity;
      readonly grossTokenAmount: TokenAmount;
      readonly appliedWeights: Readonly<Record<HarvestOutcomeKey, number>>;
    };

function validateRules(rules: HarvestRuleVersion): void {
  const total = rules.outcomes.reduce((sum, outcome) => sum + outcome.weightBasisPoints, 0);
  const unique = new Set(rules.outcomes.map((outcome) => outcome.key));
  if (
    total !== 10_000 ||
    unique.size !== 4 ||
    rules.outcomes.some((outcome) => outcome.weightBasisPoints < 0)
  ) {
    throw new DomainInvariantError(
      'INVALID_HARVEST_RULES',
      'Harvest weights must contain four unique outcomes totaling 10,000',
    );
  }
}

function adjustedOutcomes(input: CalculateHarvestInput): readonly HarvestOutcomeRule[] {
  const penalty = input.unresolvedPestEvents * input.rules.pestPenaltyBasisPoints;
  const source = input.rules.outcomes.find((item) => item.key === input.rules.pestPenaltySource);
  if (!source)
    throw new DomainInvariantError(
      'INVALID_HARVEST_RULES',
      'Pest penalty source outcome is missing',
    );
  const shifted = Math.min(source.weightBasisPoints, penalty);
  return input.rules.outcomes.map((outcome) => {
    if (outcome.key === input.rules.pestPenaltySource)
      return { ...outcome, weightBasisPoints: outcome.weightBasisPoints - shifted };
    if (outcome.key === input.rules.pestPenaltyTarget)
      return { ...outcome, weightBasisPoints: outcome.weightBasisPoints + shifted };
    return outcome;
  });
}

function selectOutcome(
  outcomes: readonly HarvestOutcomeRule[],
  sample: number,
): HarvestOutcomeRule {
  let upperBound = 0;
  for (const outcome of outcomes) {
    upperBound += outcome.weightBasisPoints;
    if (sample < upperBound) return outcome;
  }
  throw new DomainInvariantError('INVALID_RANDOM_SAMPLE', 'Random sample did not match an outcome');
}

function weightsRecord(
  outcomes: readonly HarvestOutcomeRule[],
): Readonly<Record<HarvestOutcomeKey, number>> {
  return Object.freeze(
    Object.fromEntries(outcomes.map((item) => [item.key, item.weightBasisPoints])) as Record<
      HarvestOutcomeKey,
      number
    >,
  );
}

export function calculateHarvest(input: CalculateHarvestInput): HarvestResult {
  validateRules(input.rules);
  if (!Number.isInteger(input.unresolvedPestEvents) || input.unresolvedPestEvents < 0) {
    throw new DomainInvariantError(
      'INVALID_PEST_COUNT',
      'Unresolved pest count must be a non-negative integer',
    );
  }
  if (
    !Number.isInteger(input.randomBasisPoints) ||
    input.randomBasisPoints < 0 ||
    input.randomBasisPoints >= 10_000
  ) {
    throw new DomainInvariantError(
      'INVALID_RANDOM_SAMPLE',
      'Random sample must be between 0 and 9,999',
    );
  }
  if (!isAtOrAfter(input.currentTime, input.maturedAt))
    return { harvestable: false, reason: 'not_mature' };
  const outcomes = adjustedOutcomes(input);
  const selected = selectOutcome(outcomes, input.randomBasisPoints);
  const calculatedFruit = multiplyIntegerByRatios(input.crop.baseFruitCount, [
    input.yieldRate,
    selected.returnRate,
  ]);
  const fruitNumber = quantity(calculatedFruit === 0n ? 1n : calculatedFruit);
  const grossTokenAmount = multiplyByRatios(input.crop.seedCost, [
    input.yieldRate,
    selected.returnRate,
  ]);
  return {
    harvestable: true,
    cropRuleVersion: input.crop.version,
    harvestRuleVersion: input.rules.version,
    outcome: selected.key,
    fruitNumber,
    grossTokenAmount,
    appliedWeights: weightsRecord(outcomes),
  };
}
