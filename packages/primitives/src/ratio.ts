import { DomainInvariantError } from './invariant-error';
import { tokenAmount, type TokenAmount } from './token-amount';

export interface Ratio {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

export type RoundingMode = 'floor' | 'ceil';

export function ratio(numerator: bigint | number, denominator: bigint | number): Ratio {
  const parsedNumerator = BigInt(numerator);
  const parsedDenominator = BigInt(denominator);
  if (parsedNumerator < 0n || parsedDenominator <= 0n) {
    throw new DomainInvariantError(
      'INVALID_RATIO',
      'Ratio requires a non-negative numerator and positive denominator',
    );
  }
  return Object.freeze({ numerator: parsedNumerator, denominator: parsedDenominator });
}

function divide(value: bigint, denominator: bigint, rounding: RoundingMode): bigint {
  const quotient = value / denominator;
  if (rounding === 'ceil' && value % denominator !== 0n) return quotient + 1n;
  return quotient;
}

export function multiplyIntegerByRatio(
  value: bigint,
  multiplier: Ratio,
  rounding: RoundingMode = 'floor',
): bigint {
  if (value < 0n)
    throw new DomainInvariantError('NEGATIVE_INTEGER', 'Ratio input cannot be negative');
  return divide(value * multiplier.numerator, multiplier.denominator, rounding);
}

export function multiplyByRatio(
  amount: TokenAmount,
  multiplier: Ratio,
  rounding: RoundingMode = 'floor',
): TokenAmount {
  return tokenAmount(multiplyIntegerByRatio(amount, multiplier, rounding));
}

export function multiplyByRatios(
  amount: TokenAmount,
  multipliers: readonly Ratio[],
  rounding: RoundingMode = 'floor',
): TokenAmount {
  return tokenAmount(multiplyIntegerByRatios(amount, multipliers, rounding));
}

export function multiplyIntegerByRatios(
  value: bigint,
  multipliers: readonly Ratio[],
  rounding: RoundingMode = 'floor',
): bigint {
  if (value < 0n)
    throw new DomainInvariantError('NEGATIVE_INTEGER', 'Ratio input cannot be negative');
  const combined = multipliers.reduce(
    (result, item) => ({
      numerator: result.numerator * item.numerator,
      denominator: result.denominator * item.denominator,
    }),
    { numerator: 1n, denominator: 1n },
  );
  return divide(value * combined.numerator, combined.denominator, rounding);
}
