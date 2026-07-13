import type { EntityId } from '@token-farmer/primitives';

import type {
  LedgerEntry,
  LedgerEntryDraft,
  TokenPackage,
  TokenReservation,
  WalletSnapshot,
} from '../domain/wallet';

export interface WalletRepository {
  lockById(walletId: EntityId): Promise<WalletSnapshot | undefined>;
  save(wallet: WalletSnapshot): Promise<void>;
}

export interface LedgerRepository {
  findByIdempotency(
    walletId: EntityId,
    operation: string,
    idempotencyKey: string,
  ): Promise<LedgerEntry | undefined>;
  append(entry: LedgerEntryDraft): Promise<LedgerEntry>;
}

export interface ReservationRepository {
  findById(id: EntityId): Promise<TokenReservation | undefined>;
  save(reservation: TokenReservation): Promise<void>;
}

export interface TokenPackageRepository {
  findBySource(ownerId: EntityId, sourceReference: string): Promise<TokenPackage | undefined>;
  create(tokenPackage: TokenPackage): Promise<void>;
  markActivated(id: EntityId, activatedAt: TokenPackage['createdAt']): Promise<void>;
}

export interface WalletTransactionContext {
  readonly wallets: WalletRepository;
  readonly ledger: LedgerRepository;
  readonly reservations: ReservationRepository;
  readonly tokenPackages: TokenPackageRepository;
}

export interface WalletUnitOfWork {
  transaction<T>(work: (context: WalletTransactionContext) => Promise<T>): Promise<T>;
}
