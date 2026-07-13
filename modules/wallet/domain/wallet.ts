import type { EntityId, TokenAmount, TokenDelta, UtcInstant } from '@token-farmer/primitives';

export interface WalletSnapshot {
  readonly id: EntityId;
  readonly userId: EntityId;
  readonly modelId: string;
  readonly balance: TokenAmount;
  readonly reserved: TokenAmount;
  readonly revision: bigint;
}

export type ReservationStatus = 'active' | 'settled' | 'released';

export interface TokenReservation {
  readonly id: EntityId;
  readonly walletId: EntityId;
  readonly amount: TokenAmount;
  readonly status: ReservationStatus;
  readonly businessReference: string;
  readonly createdAt: UtcInstant;
  readonly completedAt?: UtcInstant;
  readonly chargedAmount?: TokenAmount;
}

export type LedgerEntryKind =
  | 'welcome_grant'
  | 'purchase_credit'
  | 'planting_debit'
  | 'farm_maintenance'
  | 'harvest_credit'
  | 'steal_credit'
  | 'api_charge'
  | 'refund_credit'
  | 'admin_adjustment'
  | 'reservation_hold'
  | 'reservation_release';

export type CreditLedgerEntryKind = Extract<
  LedgerEntryKind,
  | 'welcome_grant'
  | 'purchase_credit'
  | 'harvest_credit'
  | 'steal_credit'
  | 'refund_credit'
  | 'admin_adjustment'
>;

export type DebitLedgerEntryKind = Extract<
  LedgerEntryKind,
  'planting_debit' | 'farm_maintenance' | 'admin_adjustment'
>;

export interface LedgerEntryDraft {
  readonly walletId: EntityId;
  readonly kind: LedgerEntryKind;
  readonly delta: TokenDelta;
  readonly resultingBalance: TokenAmount;
  readonly businessReference: string;
  readonly idempotencyKey: string;
  readonly occurredAt: UtcInstant;
}

export interface LedgerEntry extends LedgerEntryDraft {
  readonly id: EntityId;
}

export interface TokenPackage {
  readonly id: EntityId;
  readonly ownerId: EntityId;
  readonly modelId: string;
  readonly amount: TokenAmount;
  readonly source: 'harvest' | 'steal';
  readonly sourceReference: string;
  readonly plantingId: EntityId;
  readonly stealAttemptId?: EntityId;
  readonly ruleVersion: string;
  readonly status: 'available' | 'activated';
  readonly createdAt: UtcInstant;
  readonly activatedAt?: UtcInstant;
}
