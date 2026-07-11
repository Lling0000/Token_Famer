import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { entityId, tokenAmount, utcInstant } from '@token-farmer/primitives';

import { availableTokens, releaseWalletReservation, reserveWallet } from './wallet-balance';
import type { WalletSnapshot } from './wallet';

describe('wallet reservation invariants', () => {
  it('a reserve-release round trip preserves posted and available balance', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000_000 }),
        fc.integer({ min: 1, max: 1_000_000_000 }),
        (balanceSample, reservationSample) => {
          const balance = Math.max(balanceSample, reservationSample);
          const wallet: WalletSnapshot = {
            id: entityId('wallet-property'),
            userId: entityId('user-property'),
            modelId: 'property-model',
            balance: tokenAmount(balance),
            reserved: tokenAmount(0),
            revision: 0n,
          };
          const occurredAt = utcInstant('2026-07-11T00:00:00Z');
          const held = reserveWallet(wallet, {
            reservationId: entityId('reservation-property'),
            amount: tokenAmount(reservationSample),
            businessReference: 'property',
            idempotencyKey: 'property-hold',
            occurredAt,
          });
          const released = releaseWalletReservation(held.wallet, held.reservation, {
            idempotencyKey: 'property-release',
            occurredAt,
          });
          expect(released.wallet.balance).toBe(BigInt(balance));
          expect(availableTokens(released.wallet)).toBe(BigInt(balance));
        },
      ),
    );
  });
});
