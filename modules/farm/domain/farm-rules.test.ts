import { describe, expect, it } from 'vitest';

import {
  quantity,
  ratio,
  tokenAmount,
  utcInstant,
  type UtcInstant,
} from '@token-farmer/primitives';

import { calculateHarvest } from './calculate-harvest';
import { canPlant } from './can-plant';
import { DEFAULT_HARVEST_RULES, type CropRuleVersion } from './farm-rules';

const effectiveFrom = utcInstant('2026-07-11T00:00:00Z');
const crop: CropRuleVersion = {
  version: 'crop-1-v1',
  cropId: 'crop-1',
  displayName: 'Token Sprout',
  requiredFarmerLevel: 1,
  requiredPlotLevel: 1,
  seedCost: tokenAmount(10_000),
  baseFruitCount: quantity(5),
  growthDurationMilliseconds: 60_000,
  maximumReturnRate: ratio(29, 20),
  effectiveFrom,
};

function harvestAt(
  randomBasisPoints: number,
  currentTime: UtcInstant = utcInstant('2026-07-11T00:01:00Z'),
  pests = 0,
) {
  return calculateHarvest({
    crop,
    yieldRate: ratio(1, 1),
    maturedAt: utcInstant('2026-07-11T00:01:00Z'),
    currentTime,
    unresolvedPestEvents: pests,
    randomBasisPoints,
    rules: DEFAULT_HARVEST_RULES,
  });
}

describe('canPlant', () => {
  const plot = { status: 'idle' as const, plotLevel: 1, farmerLevel: 1, yieldRate: ratio(1, 1) };

  it('returns the exact maximum reward reserve', () => {
    const decision = canPlant(
      { availableTokens: tokenAmount(10_000), rewardReserveAvailable: tokenAmount(14_500) },
      plot,
      crop,
    );
    expect(decision).toEqual({ allowed: true, seedCost: 10_000n, rewardReserveRequired: 14_500n });
  });

  it('rejects insufficient player balance or platform reserve', () => {
    expect(
      canPlant(
        { availableTokens: tokenAmount(9_999), rewardReserveAvailable: tokenAmount(99_999) },
        plot,
        crop,
      ),
    ).toEqual(expect.objectContaining({ allowed: false, reason: 'insufficient_wallet_balance' }));
    expect(
      canPlant(
        { availableTokens: tokenAmount(10_000), rewardReserveAvailable: tokenAmount(14_499) },
        plot,
        crop,
      ),
    ).toEqual(expect.objectContaining({ allowed: false, reason: 'insufficient_reward_reserve' }));
  });
});

describe('calculateHarvest', () => {
  it.each([
    [799, 'loss', 5_000n],
    [800, 'base', 10_000n],
    [8_299, 'base', 10_000n],
    [8_300, 'bonus', 11_000n],
    [9_799, 'bonus', 11_000n],
    [9_800, 'jackpot', 14_500n],
  ])('maps sample %i to %s', (sample, outcome, amount) => {
    expect(harvestAt(sample)).toEqual(
      expect.objectContaining({ harvestable: true, outcome, grossTokenAmount: amount }),
    );
  });

  it('shifts ten percentage points from base to loss for each unresolved pest', () => {
    const result = harvestAt(1_000, utcInstant('2026-07-11T00:01:00Z'), 1);
    expect(result).toEqual(
      expect.objectContaining({
        harvestable: true,
        outcome: 'loss',
        appliedWeights: { loss: 1_800, base: 6_500, bonus: 1_500, jackpot: 200 },
      }),
    );
  });

  it('does not harvest before the caller-provided maturity time', () => {
    expect(harvestAt(9_999, utcInstant('2026-07-11T00:00:59Z'))).toEqual({
      harvestable: false,
      reason: 'not_mature',
    });
  });

  it('applies land and outcome multipliers once before integer rounding', () => {
    const result = calculateHarvest({
      crop,
      yieldRate: ratio(11, 10),
      maturedAt: utcInstant('2026-07-11T00:01:00Z'),
      currentTime: utcInstant('2026-07-11T00:01:00Z'),
      unresolvedPestEvents: 0,
      randomBasisPoints: 9_800,
      rules: DEFAULT_HARVEST_RULES,
    });
    expect(result).toEqual(expect.objectContaining({ fruitNumber: 7n, grossTokenAmount: 15_950n }));
  });
});
