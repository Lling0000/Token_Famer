import { DomainInvariantError } from './invariant-error';

declare const tokenAmountBrand: unique symbol;
declare const tokenDeltaBrand: unique symbol;

export type TokenAmount = bigint & { readonly [tokenAmountBrand]: 'TokenAmount' };
export type TokenDelta = bigint & { readonly [tokenDeltaBrand]: 'TokenDelta' };

export const ZERO_TOKENS = 0n as TokenAmount;
export const ZERO_TOKEN_DELTA = 0n as TokenDelta;

function parseInteger(value: bigint | number | string, field: string): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === 'string' && /^-?(0|[1-9]\d*)$/.test(value)) return BigInt(value);
  throw new DomainInvariantError('INVALID_INTEGER', `${field} must be a base-10 integer`);
}

export function tokenAmount(value: bigint | number | string): TokenAmount {
  const parsed = parseInteger(value, 'TokenAmount');
  if (parsed < 0n) {
    throw new DomainInvariantError('NEGATIVE_TOKEN_AMOUNT', 'TokenAmount cannot be negative');
  }
  return parsed as TokenAmount;
}

export function tokenDelta(value: bigint | number | string): TokenDelta {
  return parseInteger(value, 'TokenDelta') as TokenDelta;
}

export function serializeTokenAmount(value: TokenAmount): string {
  return value.toString(10);
}

export function parseTokenAmount(value: unknown): TokenAmount {
  if (typeof value !== 'string') {
    throw new DomainInvariantError('INVALID_TOKEN_JSON', 'Token amounts must be JSON strings');
  }
  return tokenAmount(value);
}

export function addTokenAmounts(...values: readonly TokenAmount[]): TokenAmount {
  return values.reduce<bigint>((total, value) => total + value, 0n) as TokenAmount;
}

export function subtractTokenAmounts(left: TokenAmount, right: TokenAmount): TokenAmount {
  if (right > left) {
    throw new DomainInvariantError('TOKEN_UNDERFLOW', 'Token balance cannot become negative');
  }
  return (left - right) as TokenAmount;
}

export function applyTokenDelta(balance: TokenAmount, delta: TokenDelta): TokenAmount {
  const next = balance + delta;
  if (next < 0n) {
    throw new DomainInvariantError('TOKEN_UNDERFLOW', 'Token balance cannot become negative');
  }
  return next as TokenAmount;
}

export function minTokenAmount(left: TokenAmount, right: TokenAmount): TokenAmount {
  return left <= right ? left : right;
}
