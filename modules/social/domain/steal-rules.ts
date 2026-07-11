import { ratio, type Ratio } from '@token-farmer/primitives';

export interface ProbabilityAmountBand {
  readonly key: string;
  readonly weightBasisPoints: number;
  readonly amountRate: Ratio;
}

export interface StealRuleVersion {
  readonly version: string;
  readonly budgetBands: readonly ProbabilityAmountBand[];
  readonly amountBands: readonly ProbabilityAmountBand[];
  readonly baseSuccessBasisPoints: number;
  readonly intimacySuccessStepBasisPoints: number;
  readonly maximumSuccessBasisPoints: number;
  readonly maximumIntimacyLevel: number;
  readonly newAccountProtectionMilliseconds: number;
  readonly newFriendProtectionMilliseconds: number;
  readonly ownerExclusiveMilliseconds: number;
  readonly maximumDailyAttempts: number;
  readonly dogCaptureBasisPoints: number;
}

export const DEFAULT_STEAL_RULES: StealRuleVersion = Object.freeze({
  version: 'steal-v1',
  budgetBands: Object.freeze([
    Object.freeze({ key: 'five_percent', weightBasisPoints: 4_500, amountRate: ratio(5, 100) }),
    Object.freeze({ key: 'ten_percent', weightBasisPoints: 3_000, amountRate: ratio(10, 100) }),
    Object.freeze({ key: 'twenty_percent', weightBasisPoints: 1_500, amountRate: ratio(20, 100) }),
    Object.freeze({ key: 'thirty_percent', weightBasisPoints: 800, amountRate: ratio(30, 100) }),
    Object.freeze({ key: 'forty_percent', weightBasisPoints: 200, amountRate: ratio(40, 100) }),
  ]),
  amountBands: Object.freeze([
    Object.freeze({ key: 'small', weightBasisPoints: 6_000, amountRate: ratio(1, 100) }),
    Object.freeze({ key: 'medium', weightBasisPoints: 3_000, amountRate: ratio(25, 1_000) }),
    Object.freeze({ key: 'large', weightBasisPoints: 1_000, amountRate: ratio(5, 100) }),
  ]),
  baseSuccessBasisPoints: 3_500,
  intimacySuccessStepBasisPoints: 600,
  maximumSuccessBasisPoints: 6_500,
  maximumIntimacyLevel: 5,
  newAccountProtectionMilliseconds: 72 * 60 * 60 * 1_000,
  newFriendProtectionMilliseconds: 24 * 60 * 60 * 1_000,
  ownerExclusiveMilliseconds: 10 * 60 * 1_000,
  maximumDailyAttempts: 20,
  dogCaptureBasisPoints: 4_000,
});
