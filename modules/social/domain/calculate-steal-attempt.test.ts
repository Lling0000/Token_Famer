import { describe, expect, it } from 'vitest';

import { quantity, utcInstant } from '@token-farmer/primitives';

import {
  calculateMaximumStealableFruit,
  calculateStealAttempt,
  type CalculateStealAttemptInput,
} from './calculate-steal-attempt';
import { DEFAULT_STEAL_RULES } from './steal-rules';

const baseInput: CalculateStealAttemptInput = {
  currentTime: utcInstant('2026-07-11T12:00:00Z'),
  ownerProtectionStartedAt: utcInstant('2026-07-01T00:00:00Z'),
  attackerProtectionStartedAt: utcInstant('2026-07-01T00:00:00Z'),
  relationship: {
    accepted: true,
    acceptedAt: utcInstant('2026-07-09T00:00:00Z'),
    intimacyLevel: 0,
    attackerAttemptsToday: 0,
  },
  crop: {
    fruitNumber: quantity(200),
    leftFruitNumber: quantity(190),
    stolenNumber: quantity(10),
    maximumStealableFruit: quantity(40),
    maturedAt: utcInstant('2026-07-11T11:00:00Z'),
    stealable: true,
    alreadyAttempted: false,
  },
  guard: {},
  random: { guardBasisPoints: 9_999, successBasisPoints: 0, amountBasisPoints: 0 },
  rules: DEFAULT_STEAL_RULES,
};

describe('dynamic steal budget', () => {
  it.each([
    [0, 'five_percent', 10n],
    [4_499, 'five_percent', 10n],
    [4_500, 'ten_percent', 20n],
    [7_500, 'twenty_percent', 40n],
    [9_000, 'thirty_percent', 60n],
    [9_800, 'forty_percent', 80n],
  ])('maps sample %i to %s', (sample, budgetBand, maximumStealableFruit) => {
    expect(calculateMaximumStealableFruit(quantity(200), sample, DEFAULT_STEAL_RULES)).toEqual({
      budgetBand,
      maximumStealableFruit,
    });
  });

  it('rounds a crop budget down and makes a zero budget non-stealable', () => {
    expect(calculateMaximumStealableFruit(quantity(5), 0, DEFAULT_STEAL_RULES)).toEqual({
      budgetBand: 'five_percent',
      maximumStealableFruit: 0n,
    });
  });
});

describe('calculateStealAttempt', () => {
  it('has both misses and different successful quantities', () => {
    const miss = calculateStealAttempt({
      ...baseInput,
      random: { ...baseInput.random, successBasisPoints: 3_500 },
    });
    const small = calculateStealAttempt(baseInput);
    const large = calculateStealAttempt({
      ...baseInput,
      random: { ...baseInput.random, amountBasisPoints: 9_999 },
    });
    expect(miss).toEqual(expect.objectContaining({ outcome: 'miss', stolenFruit: 0n }));
    expect(small).toEqual(
      expect.objectContaining({ outcome: 'stolen', stolenFruit: 2n, amountBand: 'small' }),
    );
    expect(large).toEqual(
      expect.objectContaining({ outcome: 'stolen', stolenFruit: 10n, amountBand: 'large' }),
    );
  });

  it('increases success chance with intimacy but caps it at 65 percent', () => {
    const result = calculateStealAttempt({
      ...baseInput,
      relationship: { ...baseInput.relationship, intimacyLevel: 99 },
      random: { ...baseInput.random, successBasisPoints: 6_499 },
    });
    expect(result).toEqual(
      expect.objectContaining({ outcome: 'stolen', successBasisPoints: 6_500 }),
    );
  });

  it('lets an active dog catch an otherwise successful attempt', () => {
    const result = calculateStealAttempt({
      ...baseInput,
      guard: { activeUntil: utcInstant('2026-07-12T00:00:00Z') },
      random: { ...baseInput.random, guardBasisPoints: 3_999 },
    });
    expect(result).toEqual(expect.objectContaining({ outcome: 'dog_caught', stolenFruit: 0n }));
  });

  it('rejects repeated attempts and caps a win by the remaining crop budget', () => {
    expect(
      calculateStealAttempt({ ...baseInput, crop: { ...baseInput.crop, alreadyAttempted: true } }),
    ).toEqual(
      expect.objectContaining({ eligible: false, attempted: false, reason: 'already_attempted' }),
    );
    const capped = calculateStealAttempt({
      ...baseInput,
      crop: {
        ...baseInput.crop,
        leftFruitNumber: quantity(161),
        stolenNumber: quantity(39),
        maximumStealableFruit: quantity(40),
      },
      random: { ...baseInput.random, amountBasisPoints: 9_999 },
    });
    expect(capped).toEqual(expect.objectContaining({ outcome: 'stolen', stolenFruit: 1n }));
  });

  it('enforces new-account, new-friend, owner-exclusive, and daily protections', () => {
    const newOwner = calculateStealAttempt({
      ...baseInput,
      ownerProtectionStartedAt: utcInstant('2026-07-10T00:00:00Z'),
    });
    const newFriend = calculateStealAttempt({
      ...baseInput,
      relationship: { ...baseInput.relationship, acceptedAt: utcInstant('2026-07-11T00:00:00Z') },
    });
    const exclusive = calculateStealAttempt({
      ...baseInput,
      crop: { ...baseInput.crop, maturedAt: utcInstant('2026-07-11T11:55:00Z') },
    });
    const limited = calculateStealAttempt({
      ...baseInput,
      relationship: { ...baseInput.relationship, attackerAttemptsToday: 20 },
    });
    expect(newOwner).toEqual(expect.objectContaining({ reason: 'owner_new_account_protection' }));
    expect(newFriend).toEqual(expect.objectContaining({ reason: 'new_friend_protection' }));
    expect(exclusive).toEqual(expect.objectContaining({ reason: 'owner_exclusive_period' }));
    expect(limited).toEqual(expect.objectContaining({ reason: 'daily_attempt_limit' }));
  });
});
