import { describe, expect, it } from 'vitest';

import { ratio, tokenAmount, utcInstant } from '@token-farmer/primitives';

import { calculateApiCharge } from './api-charge';
import type { ModelPriceVersion } from './model-price';

const price: ModelPriceVersion = {
  version: 'gpt-mini-2026-07-11',
  modelId: 'gpt-5.4-mini',
  effectiveFrom: utcInstant('2026-07-11T00:00:00Z'),
  inputRate: ratio(1, 1),
  outputRate: ratio(4, 1),
  cacheWriteRate: ratio(5, 4),
  cacheReadRate: ratio(1, 10),
};

describe('calculateApiCharge', () => {
  it('charges disjoint usage categories with their versioned rates', () => {
    const result = calculateApiCharge(
      {
        uncachedInputTokens: tokenAmount(1_000),
        outputTokens: tokenAmount(200),
        cacheWriteTokens: tokenAmount(100),
        cacheReadTokens: tokenAmount(500),
      },
      price,
    );
    expect(result).toEqual(
      expect.objectContaining({
        inputCharge: 1_000n,
        outputCharge: 800n,
        cacheWriteCharge: 125n,
        cacheReadCharge: 50n,
        totalCharge: 1_975n,
        priceVersion: 'gpt-mini-2026-07-11',
      }),
    );
  });

  it('rounds every non-zero fractional component up without floating point', () => {
    const result = calculateApiCharge(
      {
        uncachedInputTokens: tokenAmount(0),
        outputTokens: tokenAmount(0),
        cacheWriteTokens: tokenAmount(1),
        cacheReadTokens: tokenAmount(1),
      },
      price,
    );
    expect(result.cacheWriteCharge).toBe(2n);
    expect(result.cacheReadCharge).toBe(1n);
  });
});
