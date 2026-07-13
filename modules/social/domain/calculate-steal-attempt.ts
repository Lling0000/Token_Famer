import {
  DomainInvariantError,
  addUtcMilliseconds,
  isAtOrAfter,
  multiplyIntegerByRatio,
  quantity,
  type Quantity,
  type UtcInstant,
} from '@token-farmer/primitives';

import type { ProbabilityAmountBand, StealRuleVersion } from './steal-rules';

export interface StealRelationshipSnapshot {
  readonly accepted: boolean;
  readonly acceptedAt: UtcInstant;
  readonly intimacyLevel: number;
  readonly attackerAttemptsToday: number;
}

export interface StealableCropSnapshot {
  readonly fruitNumber: Quantity;
  readonly leftFruitNumber: Quantity;
  readonly stolenNumber: Quantity;
  readonly maximumStealableFruit: Quantity;
  readonly maturedAt: UtcInstant;
  readonly stealable: boolean;
  readonly alreadyAttempted: boolean;
}

export interface DogGuardSnapshot {
  readonly activeUntil?: UtcInstant;
}

export interface StealRandomSamples {
  readonly guardBasisPoints: number;
  readonly successBasisPoints: number;
  readonly amountBasisPoints: number;
}

export interface CalculateStealAttemptInput {
  readonly currentTime: UtcInstant;
  readonly ownerProtectionStartedAt: UtcInstant;
  readonly attackerProtectionStartedAt: UtcInstant;
  readonly relationship: StealRelationshipSnapshot;
  readonly crop: StealableCropSnapshot;
  readonly guard: DogGuardSnapshot;
  readonly random: StealRandomSamples;
  readonly rules: StealRuleVersion;
}

export type StealIneligibleReason =
  | 'not_friends'
  | 'already_attempted'
  | 'not_stealable'
  | 'owner_new_account_protection'
  | 'attacker_new_account_protection'
  | 'new_friend_protection'
  | 'owner_exclusive_period'
  | 'daily_attempt_limit'
  | 'steal_budget_exhausted';

export type StealAttemptResult =
  | {
      readonly eligible: false;
      readonly attempted: false;
      readonly reason: StealIneligibleReason;
      readonly stolenFruit: Quantity;
    }
  | {
      readonly eligible: true;
      readonly attempted: true;
      readonly outcome: 'dog_caught' | 'miss' | 'stolen';
      readonly stolenFruit: Quantity;
      readonly successBasisPoints: number;
      readonly amountBand?: string;
    };

function validateSample(sample: number, field: string): void {
  if (!Number.isInteger(sample) || sample < 0 || sample >= 10_000) {
    throw new DomainInvariantError('INVALID_RANDOM_SAMPLE', `${field} must be between 0 and 9,999`);
  }
}

function validateRules(rules: StealRuleVersion): void {
  const validBands = [rules.budgetBands, rules.amountBands].every(
    (bands) =>
      bands.every((band) => band.weightBasisPoints >= 0) &&
      bands.reduce((sum, band) => sum + band.weightBasisPoints, 0) === 10_000,
  );
  const validProbability =
    rules.baseSuccessBasisPoints >= 0 &&
    rules.maximumSuccessBasisPoints <= 10_000 &&
    rules.dogCaptureBasisPoints >= 0 &&
    rules.dogCaptureBasisPoints <= 10_000;
  if (
    !validBands ||
    !validProbability ||
    rules.maximumIntimacyLevel < 0 ||
    rules.maximumDailyAttempts < 1
  ) {
    throw new DomainInvariantError(
      'INVALID_STEAL_RULES',
      'Steal rule probabilities or limits are invalid',
    );
  }
}

function selectBand(
  bands: readonly ProbabilityAmountBand[],
  sample: number,
): ProbabilityAmountBand {
  let upperBound = 0;
  for (const band of bands) {
    upperBound += band.weightBasisPoints;
    if (sample < upperBound) return band;
  }
  throw new DomainInvariantError(
    'INVALID_RANDOM_SAMPLE',
    'Random sample did not match a steal band',
  );
}

export function calculateMaximumStealableFruit(
  fruitNumber: Quantity,
  randomBasisPoints: number,
  rules: StealRuleVersion,
): { readonly maximumStealableFruit: Quantity; readonly budgetBand: string } {
  validateRules(rules);
  validateSample(randomBasisPoints, 'budgetBasisPoints');
  const band = selectBand(rules.budgetBands, randomBasisPoints);
  const calculated = multiplyIntegerByRatio(fruitNumber, band.amountRate);
  return { maximumStealableFruit: quantity(calculated), budgetBand: band.key };
}

function protectionReason(input: CalculateStealAttemptInput): StealIneligibleReason | undefined {
  return (
    basicProtectionReason(input) ?? timedProtectionReason(input) ?? limitProtectionReason(input)
  );
}

function basicProtectionReason(
  input: CalculateStealAttemptInput,
): StealIneligibleReason | undefined {
  if (!input.relationship.accepted) return 'not_friends';
  if (input.crop.alreadyAttempted) return 'already_attempted';
  if (
    !input.crop.stealable ||
    input.crop.leftFruitNumber === 0n ||
    input.crop.maximumStealableFruit === 0n
  )
    return 'not_stealable';
  return undefined;
}

function timedProtectionReason(
  input: CalculateStealAttemptInput,
): StealIneligibleReason | undefined {
  const ownerSafeAt = addUtcMilliseconds(
    input.ownerProtectionStartedAt,
    input.rules.newAccountProtectionMilliseconds,
  );
  if (!isAtOrAfter(input.currentTime, ownerSafeAt)) return 'owner_new_account_protection';
  const attackerSafeAt = addUtcMilliseconds(
    input.attackerProtectionStartedAt,
    input.rules.newAccountProtectionMilliseconds,
  );
  if (!isAtOrAfter(input.currentTime, attackerSafeAt)) return 'attacker_new_account_protection';
  const friendSafeAt = addUtcMilliseconds(
    input.relationship.acceptedAt,
    input.rules.newFriendProtectionMilliseconds,
  );
  if (!isAtOrAfter(input.currentTime, friendSafeAt)) return 'new_friend_protection';
  const exclusiveEndsAt = addUtcMilliseconds(
    input.crop.maturedAt,
    input.rules.ownerExclusiveMilliseconds,
  );
  if (!isAtOrAfter(input.currentTime, exclusiveEndsAt)) return 'owner_exclusive_period';
  return undefined;
}

function limitProtectionReason(
  input: CalculateStealAttemptInput,
): StealIneligibleReason | undefined {
  if (input.relationship.attackerAttemptsToday >= input.rules.maximumDailyAttempts)
    return 'daily_attempt_limit';
  if (input.crop.stolenNumber >= input.crop.maximumStealableFruit) return 'steal_budget_exhausted';
  return undefined;
}

function successChance(input: CalculateStealAttemptInput): number {
  const intimacy = Math.min(input.relationship.intimacyLevel, input.rules.maximumIntimacyLevel);
  return Math.min(
    input.rules.maximumSuccessBasisPoints,
    input.rules.baseSuccessBasisPoints + intimacy * input.rules.intimacySuccessStepBasisPoints,
  );
}

function isGuardCapture(input: CalculateStealAttemptInput): boolean {
  if (!input.guard.activeUntil || isAtOrAfter(input.currentTime, input.guard.activeUntil))
    return false;
  return input.random.guardBasisPoints < input.rules.dogCaptureBasisPoints;
}

function stolenAmount(input: CalculateStealAttemptInput, band: ProbabilityAmountBand): Quantity {
  const calculated = multiplyIntegerByRatio(input.crop.fruitNumber, band.amountRate);
  const requested = calculated === 0n ? 1n : calculated;
  const budgetLeft = input.crop.maximumStealableFruit - input.crop.stolenNumber;
  const capped = requested < input.crop.leftFruitNumber ? requested : input.crop.leftFruitNumber;
  return quantity(capped < budgetLeft ? capped : budgetLeft);
}

export function calculateStealAttempt(input: CalculateStealAttemptInput): StealAttemptResult {
  validateRules(input.rules);
  Object.entries(input.random).forEach(([field, sample]) => validateSample(sample, field));
  if (!Number.isInteger(input.relationship.intimacyLevel) || input.relationship.intimacyLevel < 0) {
    throw new DomainInvariantError(
      'INVALID_INTIMACY',
      'Intimacy level must be a non-negative integer',
    );
  }
  if (
    input.crop.stolenNumber > input.crop.maximumStealableFruit ||
    input.crop.leftFruitNumber + input.crop.stolenNumber !== input.crop.fruitNumber
  ) {
    throw new DomainInvariantError('INVALID_CROP_SNAPSHOT', 'Crop steal counters are inconsistent');
  }
  const reason = protectionReason(input);
  if (reason) return { eligible: false, attempted: false, reason, stolenFruit: quantity(0) };
  const chance = successChance(input);
  if (isGuardCapture(input))
    return {
      eligible: true,
      attempted: true,
      outcome: 'dog_caught',
      stolenFruit: quantity(0),
      successBasisPoints: chance,
    };
  if (input.random.successBasisPoints >= chance) {
    return {
      eligible: true,
      attempted: true,
      outcome: 'miss',
      stolenFruit: quantity(0),
      successBasisPoints: chance,
    };
  }
  const band = selectBand(input.rules.amountBands, input.random.amountBasisPoints);
  return {
    eligible: true,
    attempted: true,
    outcome: 'stolen',
    stolenFruit: stolenAmount(input, band),
    successBasisPoints: chance,
    amountBand: band.key,
  };
}
