import { describe, expect, it } from 'vitest';

import { entityId, tokenAmount, utcInstant } from '@token-farmer/primitives';

import {
  availableTokens,
  creditWallet,
  debitWallet,
  releaseWalletReservation,
  reserveWallet,
  settleWalletReservation,
} from './wallet-balance';
import type { WalletSnapshot } from './wallet';

const occurredAt = utcInstant('2026-07-11T00:00:00Z');
const baseWallet: WalletSnapshot = {
  id: entityId('wallet-1'),
  userId: entityId('user-1'),
  modelId: 'gpt-5.4-mini',
  balance: tokenAmount(20_000),
  reserved: tokenAmount(0),
  revision: 0n,
};

describe('wallet balance transitions', () => {
  it('reserves, settles the actual charge, and releases unused capacity', () => {
    const held = reserveWallet(baseWallet, {
      reservationId: entityId('reservation-1'),
      amount: tokenAmount(5_000),
      businessReference: 'request-1',
      idempotencyKey: 'hold-1',
      occurredAt,
    });
    const settled = settleWalletReservation(held.wallet, held.reservation, {
      chargedAmount: tokenAmount(3_000),
      kind: 'api_charge',
      idempotencyKey: 'settle-1',
      occurredAt,
    });
    expect(settled.wallet.balance).toBe(17_000n);
    expect(settled.wallet.reserved).toBe(0n);
    expect(settled.ledger.delta).toBe(-3_000n);
  });

  it('prevents over-reserving, insolvent settlement, and double completion', () => {
    expect(() =>
      reserveWallet(baseWallet, {
        reservationId: entityId('too-large'),
        amount: tokenAmount(20_001),
        businessReference: 'x',
        idempotencyKey: 'x',
        occurredAt,
      }),
    ).toThrow();
    const held = reserveWallet(baseWallet, {
      reservationId: entityId('reservation-2'),
      amount: tokenAmount(2_000),
      businessReference: 'x',
      idempotencyKey: 'y',
      occurredAt,
    });
    expect(() =>
      settleWalletReservation(held.wallet, held.reservation, {
        chargedAmount: tokenAmount(20_001),
        kind: 'api_charge',
        idempotencyKey: 'z',
        occurredAt,
      }),
    ).toThrow();
    const released = releaseWalletReservation(held.wallet, held.reservation, {
      idempotencyKey: 'r',
      occurredAt,
    });
    expect(() =>
      releaseWalletReservation(released.wallet, released.reservation, {
        idempotencyKey: 'r2',
        occurredAt,
      }),
    ).toThrow();
  });

  it('allows a final charge above the estimate when unreserved balance covers it', () => {
    const held = reserveWallet(baseWallet, {
      reservationId: entityId('reservation-3'),
      amount: tokenAmount(2_000),
      businessReference: 'x',
      idempotencyKey: 'y3',
      occurredAt,
    });
    const settled = settleWalletReservation(held.wallet, held.reservation, {
      chargedAmount: tokenAmount(2_001),
      kind: 'api_charge',
      idempotencyKey: 'z3',
      occurredAt,
    });
    expect(settled.wallet).toEqual(expect.objectContaining({ balance: 17_999n, reserved: 0n }));
  });

  it('credits only through an immutable ledger mutation', () => {
    const credited = creditWallet(baseWallet, {
      amount: tokenAmount(20_000),
      kind: 'welcome_grant',
      businessReference: 'welcome:user-1:gpt-5.4-mini',
      idempotencyKey: 'welcome-1',
      occurredAt,
    });
    expect(credited.wallet.balance).toBe(40_000n);
    expect(availableTokens(credited.wallet)).toBe(40_000n);
    expect(credited.ledger.resultingBalance).toBe(40_000n);
  });

  it('does not let direct debits consume an active reservation', () => {
    const held = reserveWallet(baseWallet, {
      reservationId: entityId('reservation-4'),
      amount: tokenAmount(15_000),
      businessReference: 'x',
      idempotencyKey: 'y4',
      occurredAt,
    });
    expect(() =>
      debitWallet(held.wallet, {
        amount: tokenAmount(5_001),
        kind: 'planting_debit',
        businessReference: 'planting-1',
        idempotencyKey: 'plant-1',
        occurredAt,
      }),
    ).toThrow();
  });
});
