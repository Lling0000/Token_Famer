import {
  ratio,
  tokenAmount,
  type Quantity,
  type Ratio,
  type TokenAmount,
  type UtcInstant,
} from '@token-farmer/primitives';

export interface CropRuleVersion {
  readonly version: string;
  readonly cropId: string;
  readonly displayName: string;
  readonly requiredFarmerLevel: number;
  readonly requiredPlotLevel: number;
  readonly seedCost: TokenAmount;
  readonly baseFruitCount: Quantity;
  readonly growthDurationMilliseconds: number;
  readonly maximumReturnRate: Ratio;
  readonly effectiveFrom: UtcInstant;
  readonly effectiveUntil?: UtcInstant;
}

export type HarvestOutcomeKey = 'loss' | 'base' | 'bonus' | 'jackpot';

export interface HarvestOutcomeRule {
  readonly key: HarvestOutcomeKey;
  readonly weightBasisPoints: number;
  readonly returnRate: Ratio;
}

export interface HarvestRuleVersion {
  readonly version: string;
  readonly outcomes: readonly HarvestOutcomeRule[];
  readonly pestPenaltyBasisPoints: number;
  readonly pestPenaltySource: HarvestOutcomeKey;
  readonly pestPenaltyTarget: HarvestOutcomeKey;
}

export const DEFAULT_HARVEST_RULES: HarvestRuleVersion = Object.freeze({
  version: 'harvest-v1',
  outcomes: Object.freeze([
    Object.freeze({ key: 'loss', weightBasisPoints: 800, returnRate: ratio(1, 2) }),
    Object.freeze({ key: 'base', weightBasisPoints: 7_500, returnRate: ratio(1, 1) }),
    Object.freeze({ key: 'bonus', weightBasisPoints: 1_500, returnRate: ratio(11, 10) }),
    Object.freeze({ key: 'jackpot', weightBasisPoints: 200, returnRate: ratio(29, 20) }),
  ]),
  pestPenaltyBasisPoints: 1_000,
  pestPenaltySource: 'base',
  pestPenaltyTarget: 'loss',
});

export interface OutcomeCommitment {
  readonly algorithm: 'sha256';
  readonly digest: string;
  readonly ruleVersion: string;
  readonly committedAt: UtcInstant;
}

export const WELCOME_GRANT_PER_MODEL = tokenAmount(20_000);
