import type { EntityId, TokenAmount, UtcInstant } from '@token-farmer/primitives';

import type {
  CreditLedgerEntryKind,
  DebitLedgerEntryKind,
  LedgerEntryKind,
  TokenPackage,
  TokenReservation,
  WalletSnapshot,
} from '../domain/wallet';

export interface WalletWriteContext {
  readonly idempotencyKey: string;
  readonly businessReference: string;
  readonly occurredAt: UtcInstant;
}

export interface WalletMutationResult {
  readonly wallet: WalletSnapshot;
  readonly replayed: boolean;
}

export interface WalletService {
  credit(
    input: WalletWriteContext & {
      readonly walletId: EntityId;
      readonly amount: TokenAmount;
      readonly kind: CreditLedgerEntryKind;
    },
  ): Promise<WalletMutationResult>;
  debit(
    input: WalletWriteContext & {
      readonly walletId: EntityId;
      readonly amount: TokenAmount;
      readonly kind: DebitLedgerEntryKind;
    },
  ): Promise<WalletMutationResult>;
  reserve(
    input: WalletWriteContext & {
      readonly walletId: EntityId;
      readonly reservationId: EntityId;
      readonly amount: TokenAmount;
    },
  ): Promise<{
    readonly wallet: WalletSnapshot;
    readonly reservation: TokenReservation;
    readonly replayed: boolean;
  }>;
  settle(
    input: WalletWriteContext & {
      readonly reservationId: EntityId;
      readonly chargedAmount: TokenAmount;
      readonly kind: Extract<LedgerEntryKind, 'api_charge' | 'planting_debit'>;
    },
  ): Promise<WalletMutationResult>;
  release(
    input: WalletWriteContext & { readonly reservationId: EntityId },
  ): Promise<WalletMutationResult>;
  createTokenPackage(
    input: WalletWriteContext & { readonly tokenPackage: TokenPackage },
  ): Promise<{ readonly replayed: boolean }>;
}
