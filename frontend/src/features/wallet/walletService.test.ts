import { describe, expect, it } from 'vitest';
import { buildChargeResponse, TEST_USER } from '@/test/fixtures';
import { storageKeys } from '@/lib/storage';
import { getWallet, MAX_TOP_UP_HISTORY, recordChargeAttempt } from './walletService';

const USER_ID = TEST_USER.id;

describe('walletService', () => {
  it('inicia con saldo de $0', () => {
    expect(getWallet(USER_ID)).toEqual({ balanceCents: 0, topUps: [] });
  });

  it('suma el monto aprobado y guarda la respuesta completa (con tarjeta y CVV ficticios)', () => {
    const charge = buildChargeResponse({ transaction_amount: 250.5 });

    const wallet = recordChargeAttempt(USER_ID, 25_050, { kind: 'approved', httpStatus: 201, charge });

    expect(wallet.balanceCents).toBe(25_050);
    expect(wallet.topUps[0]).toMatchObject({ outcome: 'approved', appliedToBalance: true });
    const stored = localStorage.getItem(storageKeys.wallet(USER_ID)) ?? '';
    expect(stored).toContain('"number":"1234123412341234"');
    expect(stored).toContain('"cvv":"543"');
  });

  it.each([
    ['rechazo', { kind: 'rejected', httpStatus: 402, charge: buildChargeResponse({ status: 'rejected' }) }],
    ['error del sistema', { kind: 'system_error', httpStatus: 503, charge: null }],
    ['timeout', { kind: 'timeout' }],
    ['error de red', { kind: 'network_error' }],
    ['respuesta inválida', { kind: 'invalid_response', httpStatus: 201, charge: null }],
  ] as const)('no modifica el saldo ante un %s', (_case, result) => {
    const wallet = recordChargeAttempt(USER_ID, 10_000, result);

    expect(wallet.balanceCents).toBe(0);
    expect(wallet.topUps).toHaveLength(1);
    expect(wallet.topUps[0]?.appliedToBalance).toBe(false);
  });

  it('nunca abona dos veces la misma operación aprobada', () => {
    const charge = buildChargeResponse();

    recordChargeAttempt(USER_ID, 10_000, { kind: 'approved', httpStatus: 201, charge });
    const wallet = recordChargeAttempt(USER_ID, 10_000, { kind: 'approved', httpStatus: 201, charge });

    expect(wallet.balanceCents).toBe(10_000);
  });

  it('acumula recargas distintas y limita el historial', () => {
    for (let index = 0; index < MAX_TOP_UP_HISTORY + 5; index += 1) {
      recordChargeAttempt(USER_ID, 100, {
        kind: 'approved',
        httpStatus: 201,
        charge: buildChargeResponse({ id: `chg_${index}`, transaction_amount: 1 }),
      });
    }

    const wallet = getWallet(USER_ID);
    expect(wallet.balanceCents).toBe((MAX_TOP_UP_HISTORY + 5) * 100);
    expect(wallet.topUps).toHaveLength(MAX_TOP_UP_HISTORY);
  });
});
