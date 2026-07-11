import { DomainInvariantError } from './invariant-error';

declare const quantityBrand: unique symbol;
export type Quantity = bigint & { readonly [quantityBrand]: 'Quantity' };

export const ZERO_QUANTITY = 0n as Quantity;

export function quantity(value: bigint | number | string): Quantity {
  let parsed: bigint;
  try {
    if (typeof value === 'number' && !Number.isSafeInteger(value)) throw new Error('unsafe');
    parsed = BigInt(value);
  } catch {
    throw new DomainInvariantError('INVALID_QUANTITY', 'Quantity must be a base-10 integer');
  }
  if (parsed < 0n)
    throw new DomainInvariantError('NEGATIVE_QUANTITY', 'Quantity cannot be negative');
  return parsed as Quantity;
}
