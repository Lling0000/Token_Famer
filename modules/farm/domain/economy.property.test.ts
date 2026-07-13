import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { quantity, tokenAmount } from '@token-farmer/primitives';

import {
  calculateCumulativeStolenValue,
  calculateOwnerHarvestValue,
  calculateStealBatchValue,
} from './harvest-value';

describe('harvest value conservation', () => {
  it('allocates every Token exactly once for arbitrary steal batches', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 200 }),
        fc.integer({ min: 0, max: 200 }),
        (gross, fruitCount, sample) => {
          const stolen = Math.min(sample, fruitCount);
          const harvest = {
            grossTokenAmount: tokenAmount(gross),
            fruitNumber: quantity(fruitCount),
          };
          const stolenValue = calculateCumulativeStolenValue(harvest, quantity(stolen));
          const ownerValue = calculateOwnerHarvestValue(harvest, quantity(stolen));
          expect(stolenValue + ownerValue).toBe(BigInt(gross));
        },
      ),
    );
  });

  it('makes adjacent batch values telescope to cumulative value', () => {
    const harvest = { grossTokenAmount: tokenAmount(101), fruitNumber: quantity(7) };
    const first = calculateStealBatchValue(harvest, quantity(0), quantity(3));
    const second = calculateStealBatchValue(harvest, quantity(3), quantity(7));
    expect(first + second).toBe(101n);
  });
});
