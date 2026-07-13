import {
  DomainInvariantError,
  ZERO_TOKEN_DELTA,
  subtractTokenAmounts,
  tokenAmount,
  tokenDelta,
  type EntityId,
  type TokenAmount,
  type UtcInstant,
} from '@token-farmer/primitives';

import type {
  CreditLedgerEntryKind,
  DebitLedgerEntryKind,
  LedgerEntryDraft,
  LedgerEntryKind,
  TokenReservation,
  WalletSnapshot,
} from './wallet';

export interface WalletMutation {
  readonly wallet: WalletSnapshot;
  readonly ledger: LedgerEntryDraft;
}

export interface ReserveWalletInput {
  readonly reservationId: EntityId;
  readonly amount: TokenAmount;
  readonly businessReference: string;
  readonly idempotencyKey: string;
  readonly occurredAt: UtcInstant;
}

function assertWallet(wallet: WalletSnapshot): void {
  if (wallet.reserved > wallet.balance) {
    throw new DomainInvariantError(
      'INVALID_WALLET',
      'Reserved tokens cannot exceed wallet balance',
    );
  }
}

function ledgerFor(
  wallet: WalletSnapshot,
  input: {
    kind: LedgerEntryKind;
    delta: ReturnType<typeof tokenDelta>;
    businessReference: string;
    idempotencyKey: string;
    occurredAt: UtcInstant;
  },
): LedgerEntryDraft {
  return { walletId: wallet.id, resultingBalance: wallet.balance, ...input };
}

export function availableTokens(wallet: WalletSnapshot): TokenAmount {
  assertWallet(wallet);
  return subtractTokenAmounts(wallet.balance, wallet.reserved);
}

export function reserveWallet(
  wallet: WalletSnapshot,
  input: ReserveWalletInput,
): WalletMutation & { readonly reservation: TokenReservation } {
  if (input.amount === 0n)
    throw new DomainInvariantError('EMPTY_RESERVATION', 'Reservation amount must be positive');
  if (availableTokens(wallet) < input.amount) {
    throw new DomainInvariantError(
      'INSUFFICIENT_AVAILABLE_TOKENS',
      'Wallet has insufficient available tokens',
    );
  }
  const next = {
    ...wallet,
    reserved: tokenAmount(wallet.reserved + input.amount),
    revision: wallet.revision + 1n,
  };
  return {
    wallet: next,
    reservation: {
      id: input.reservationId,
      walletId: wallet.id,
      amount: input.amount,
      status: 'active',
      businessReference: input.businessReference,
      createdAt: input.occurredAt,
    },
    ledger: ledgerFor(next, { ...input, kind: 'reservation_hold', delta: ZERO_TOKEN_DELTA }),
  };
}

function assertActiveReservation(wallet: WalletSnapshot, reservation: TokenReservation): void {
  if (reservation.walletId !== wallet.id || reservation.status !== 'active') {
    throw new DomainInvariantError(
      'INVALID_RESERVATION',
      'Reservation is not active for this wallet',
    );
  }
  if (wallet.reserved < reservation.amount) {
    throw new DomainInvariantError(
      'INVALID_WALLET',
      'Wallet does not contain the reservation hold',
    );
  }
}

export interface SettleReservationInput {
  readonly chargedAmount: TokenAmount;
  readonly kind: Extract<LedgerEntryKind, 'api_charge' | 'planting_debit'>;
  readonly idempotencyKey: string;
  readonly occurredAt: UtcInstant;
}

export function settleWalletReservation(
  wallet: WalletSnapshot,
  reservation: TokenReservation,
  input: SettleReservationInput,
): WalletMutation & { readonly reservation: TokenReservation } {
  assertActiveReservation(wallet, reservation);
  const supplementalCharge =
    input.chargedAmount > reservation.amount
      ? tokenAmount(input.chargedAmount - reservation.amount)
      : tokenAmount(0);
  if (supplementalCharge > availableTokens(wallet)) {
    throw new DomainInvariantError(
      'INSUFFICIENT_SETTLEMENT_BALANCE',
      'Charge exceeds the hold and available balance',
    );
  }
  const next = {
    ...wallet,
    balance: subtractTokenAmounts(wallet.balance, input.chargedAmount),
    reserved: subtractTokenAmounts(wallet.reserved, reservation.amount),
    revision: wallet.revision + 1n,
  };
  return {
    wallet: next,
    reservation: {
      ...reservation,
      status: 'settled',
      completedAt: input.occurredAt,
      chargedAmount: input.chargedAmount,
    },
    ledger: ledgerFor(next, {
      ...input,
      delta: tokenDelta(-input.chargedAmount),
      businessReference: reservation.businessReference,
    }),
  };
}

export interface ReleaseReservationInput {
  readonly idempotencyKey: string;
  readonly occurredAt: UtcInstant;
}

export function releaseWalletReservation(
  wallet: WalletSnapshot,
  reservation: TokenReservation,
  input: ReleaseReservationInput,
): WalletMutation & { readonly reservation: TokenReservation } {
  assertActiveReservation(wallet, reservation);
  const next = {
    ...wallet,
    reserved: subtractTokenAmounts(wallet.reserved, reservation.amount),
    revision: wallet.revision + 1n,
  };
  return {
    wallet: next,
    reservation: { ...reservation, status: 'released', completedAt: input.occurredAt },
    ledger: ledgerFor(next, {
      ...input,
      kind: 'reservation_release',
      delta: ZERO_TOKEN_DELTA,
      businessReference: reservation.businessReference,
    }),
  };
}

export interface CreditWalletInput {
  readonly amount: TokenAmount;
  readonly kind: CreditLedgerEntryKind;
  readonly businessReference: string;
  readonly idempotencyKey: string;
  readonly occurredAt: UtcInstant;
}

export function creditWallet(wallet: WalletSnapshot, input: CreditWalletInput): WalletMutation {
  if (input.amount === 0n)
    throw new DomainInvariantError('EMPTY_CREDIT', 'Credit amount must be positive');
  const next = {
    ...wallet,
    balance: tokenAmount(wallet.balance + input.amount),
    revision: wallet.revision + 1n,
  };
  return { wallet: next, ledger: ledgerFor(next, { ...input, delta: tokenDelta(input.amount) }) };
}

export interface DebitWalletInput {
  readonly amount: TokenAmount;
  readonly kind: DebitLedgerEntryKind;
  readonly businessReference: string;
  readonly idempotencyKey: string;
  readonly occurredAt: UtcInstant;
}

export function debitWallet(wallet: WalletSnapshot, input: DebitWalletInput): WalletMutation {
  if (input.amount === 0n)
    throw new DomainInvariantError('EMPTY_DEBIT', 'Debit amount must be positive');
  if (input.amount > availableTokens(wallet)) {
    throw new DomainInvariantError(
      'INSUFFICIENT_AVAILABLE_TOKENS',
      'Debit cannot consume reserved tokens',
    );
  }
  const next = {
    ...wallet,
    balance: subtractTokenAmounts(wallet.balance, input.amount),
    revision: wallet.revision + 1n,
  };
  return { wallet: next, ledger: ledgerFor(next, { ...input, delta: tokenDelta(-input.amount) }) };
}
