import { describe, expect, it } from 'vitest';

import { multiplyByRatio, multiplyByRatios, ratio } from './ratio';
import { tokenAmount } from './token-amount';

describe('Ratio', () => {
  it('uses explicit floor and ceil rounding', () => {
    expect(multiplyByRatio(tokenAmount(5), ratio(1, 2))).toBe(2n);
    expect(multiplyByRatio(tokenAmount(5), ratio(1, 2), 'ceil')).toBe(3n);
  });

  it('combines ratios before rounding', () => {
    expect(multiplyByRatios(tokenAmount(5), [ratio(3, 2), ratio(2, 3)])).toBe(5n);
  });
});
