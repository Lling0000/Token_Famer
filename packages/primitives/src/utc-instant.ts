import { DomainInvariantError } from './invariant-error';

declare const utcInstantBrand: unique symbol;
export type UtcInstant = string & { readonly [utcInstantBrand]: 'UtcInstant' };

export function utcInstant(value: string): UtcInstant {
  const epochMilliseconds = Date.parse(value);
  if (!Number.isFinite(epochMilliseconds)) {
    throw new DomainInvariantError('INVALID_UTC_INSTANT', 'Time must be a valid ISO-8601 instant');
  }
  return new Date(epochMilliseconds).toISOString() as UtcInstant;
}

export function utcEpochMilliseconds(value: UtcInstant): number {
  return Date.parse(value);
}

export function isAtOrAfter(value: UtcInstant, threshold: UtcInstant): boolean {
  return utcEpochMilliseconds(value) >= utcEpochMilliseconds(threshold);
}

export function addUtcMilliseconds(value: UtcInstant, milliseconds: number): UtcInstant {
  if (!Number.isSafeInteger(milliseconds)) {
    throw new DomainInvariantError(
      'INVALID_DURATION',
      'Duration must be a safe integer number of milliseconds',
    );
  }
  return utcInstant(new Date(utcEpochMilliseconds(value) + milliseconds).toISOString());
}
