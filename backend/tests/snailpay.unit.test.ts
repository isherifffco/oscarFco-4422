import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config/env.js';
import { IdempotencyStore } from '../src/modules/snailpay/idempotency.store.js';
import { createChargeResponseBuilder, evaluateCharge } from '../src/modules/snailpay/snailpay.service.js';
import { buildChargeRequest } from './helpers.js';

describe('evaluateCharge', () => {
  it('solo aprueba la combinación exacta de datos de prueba', () => {
    expect(evaluateCharge(buildChargeRequest())).toEqual({ kind: 'approved' });
  });

  it('prioriza el error del sistema sobre cualquier otra regla', () => {
    expect(evaluateCharge(buildChargeRequest({ card_number: '9999999999999999', cvv: '000' }))).toEqual({
      kind: 'system_error',
      detail: 'internal_error',
    });
  });

  it('acepta exactamente el monto máximo', () => {
    expect(evaluateCharge(buildChargeRequest({ transaction_amount: 10_000 }))).toEqual({ kind: 'approved' });
  });
});

describe('createChargeResponseBuilder', () => {
  const build = createChargeResponseBuilder({
    now: () => new Date('2026-09-28T12:00:00.000Z'),
    operationId: () => 'chg_fixed',
    reference: () => 'SNP-20260928-ABC123',
    authorizationCode: () => 'AUTH42',
  });

  it('solo genera código de autorización cuando el cobro es aprobado', () => {
    const approved = build({ status: 'approved', detail: 'accredited', request: buildChargeRequest() });
    const rejected = build({
      status: 'rejected',
      detail: 'cc_rejected_high_risk',
      request: buildChargeRequest(),
    });

    expect(approved.authorization_code).toBe('AUTH42');
    expect(rejected.authorization_code).toBeNull();
    expect(approved.date_created).toBe('2026-09-28T12:00:00.000Z');
  });
});

describe('IdempotencyStore', () => {
  it('expira las llaves después del TTL', () => {
    let now = 0;
    const store = new IdempotencyStore({ ttlMs: 1_000, now: () => now });
    const body = createChargeResponseBuilder()({ status: 'approved', detail: 'accredited' });

    store.complete('llave-1234', 'hash', 201, body);
    expect(store.lookup('llave-1234', 'hash').kind).toBe('replay');

    now = 1_000;
    expect(store.lookup('llave-1234', 'hash').kind).toBe('miss');
  });

  it('descarta la llave más antigua al llegar al máximo', () => {
    const store = new IdempotencyStore({ maxEntries: 1 });

    store.markInProgress('llave-0001', 'a');
    store.markInProgress('llave-0002', 'b');

    expect(store.lookup('llave-0001', 'a').kind).toBe('miss');
    expect(store.lookup('llave-0002', 'b').kind).toBe('in_progress');
  });
});

describe('loadConfig', () => {
  it('usa valores por defecto seguros', () => {
    const config = loadConfig({});
    expect(config.port).toBe(4000);
    expect(config.snailPay.simulateOutage).toBe(false);
  });

  it('interpreta la bandera de caída y varios orígenes', () => {
    const config = loadConfig({
      SNAILPAY_SIMULATE_OUTAGE: 'true',
      CORS_ORIGIN: 'http://localhost:5173, http://127.0.0.1:5173',
    });
    expect(config.snailPay.simulateOutage).toBe(true);
    expect(config.corsOrigins).toEqual(['http://localhost:5173', 'http://127.0.0.1:5173']);
  });

  it('falla con valores inválidos', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/Configuración inválida/);
  });
});
