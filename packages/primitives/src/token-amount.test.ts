import { describe, expect, it } from 'vitest';

import {
  addTokenAmounts,
  applyTokenDelta,
  parseTokenAmount,
  serializeTokenAmount,
  subtractTokenAmounts,
  tokenAmount,
  tokenDelta,
} from './token-amount';

describe('TokenAmount', () => {
  it('round-trips through a JSON string without losing precision', () => {
    const value = tokenAmount('123456789012345678901234567890');
    expect(parseTokenAmount(serializeTokenAmount(value))).toBe(value);
  });

  it('rejects floats, negative balances, and underflow', () => {
    expect(() => tokenAmount(1.5)).toThrow();
    expect(() => tokenAmount(-1n)).toThrow();
    expect(() => subtractTokenAmounts(tokenAmount(1), tokenAmount(2))).toThrow();
  });

  it('supports exact bigint arithmetic and signed ledger deltas', () => {
    const total = addTokenAmounts(tokenAmount('9007199254740993'), tokenAmount(7));
    expect(total).toBe(9007199254741000n);
    expect(applyTokenDelta(total, tokenDelta(-1_000n))).toBe(9007199254740000n);
  });
});
