import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { buildChargeRequest, buildTestConfig } from './helpers.js';

const CHARGES_URL = '/api/snailpay/charges';

const REQUIRED_RESPONSE_FIELDS = [
  'id',
  'status',
  'status_detail',
  'transaction_amount',
  'date_created',
  'authorization_code',
  'reference',
  'payer_id',
  'payer_email',
] as const;

function expectContractFields(body: Record<string, unknown>): void {
  for (const field of REQUIRED_RESPONSE_FIELDS) {
    expect(body).toHaveProperty(field);
  }
  expect(typeof body.id).toBe('string');
  expect(typeof body.reference).toBe('string');
  expect(new Date(body.date_created as string).toISOString()).toBe(body.date_created);
}

describe('POST /api/snailpay/charges', () => {
  const app = createApp(buildTestConfig());

  describe('cobro exitoso', () => {
    it('aprueba los datos de prueba oficiales y devuelve el contrato completo', async () => {
      const payload = buildChargeRequest();

      const response = await request(app).post(CHARGES_URL).send(payload);

      expect(response.status).toBe(201);
      expectContractFields(response.body);
      expect(response.body).toMatchObject({
        status: 'approved',
        status_detail: 'accredited',
        transaction_amount: 250.5,
        currency_id: 'MXN',
        payer_id: payload.payer.id,
        payer_email: payload.payer.email,
        card: {
          number: '1234123412341234',
          cvv: '543',
          expiration_date: '12/26',
          holder_name: 'Ana Pérez',
        },
      });
      expect(response.body.id).toMatch(/^chg_[0-9a-f-]{36}$/);
      expect(response.body.authorization_code).toMatch(/^[A-Z0-9]{6}$/);
      expect(response.body.reference).toMatch(/^SNP-\d{8}-[A-Z0-9]{6}$/);
    });

    it('acepta cualquier nombre no vacío y montos con centavos', async () => {
      const response = await request(app)
        .post(CHARGES_URL)
        .send(buildChargeRequest({ holder_name: 'X', transaction_amount: 0.01 }));

      expect(response.status).toBe(201);
      expect(response.body.transaction_amount).toBe(0.01);
    });
  });

  describe('errores de transacción', () => {
    it.each([
      ['4000000000000002', 'cc_rejected_insufficient_amount'],
      ['4000000000000069', 'cc_rejected_card_disabled'],
      ['4000000000000119', 'cc_rejected_high_risk'],
      ['5555666677778888', 'cc_rejected_unknown_card'],
    ])('rechaza la tarjeta %s con %s', async (cardNumber, expectedDetail) => {
      const response = await request(app)
        .post(CHARGES_URL)
        .send(buildChargeRequest({ card_number: cardNumber }));

      expect(response.status).toBe(402);
      expectContractFields(response.body);
      expect(response.body).toMatchObject({
        status: 'rejected',
        status_detail: expectedDetail,
        authorization_code: null,
      });
    });

    it('rechaza un CVV incorrecto', async () => {
      const response = await request(app).post(CHARGES_URL).send(buildChargeRequest({ cvv: '123' }));

      expect(response.status).toBe(402);
      expect(response.body.status_detail).toBe('cc_rejected_bad_filled_security_code');
    });

    it('rechaza una fecha de vencimiento incorrecta', async () => {
      const response = await request(app)
        .post(CHARGES_URL)
        .send(buildChargeRequest({ expiration_date: '11/27' }));

      expect(response.status).toBe(402);
      expect(response.body.status_detail).toBe('cc_rejected_bad_filled_date');
    });

    it('rechaza montos mayores al límite por recarga', async () => {
      const response = await request(app)
        .post(CHARGES_URL)
        .send(buildChargeRequest({ transaction_amount: 10_000.01 }));

      expect(response.status).toBe(402);
      expect(response.body.status_detail).toBe('cc_rejected_max_amount');
    });
  });

  describe('validación de datos', () => {
    it('responde 400 con la lista de campos inválidos', async () => {
      const response = await request(app)
        .post(CHARGES_URL)
        .send(
          buildChargeRequest({
            card_number: '1234',
            expiration_date: '13/26',
            cvv: '54',
            holder_name: '   ',
            transaction_amount: 0,
          }),
        );

      expect(response.status).toBe(400);
      expectContractFields(response.body);
      expect(response.body.status).toBe('rejected');
      expect(response.body.status_detail).toBe('invalid_request');
      expect(response.body.card).toBeNull();

      const fields = (response.body.errors as { field: string }[]).map((error) => error.field);
      expect(fields).toEqual(
        expect.arrayContaining(['card_number', 'expiration_date', 'cvv', 'holder_name', 'transaction_amount']),
      );
      // Los datos válidos del pagador se conservan para poder rastrear el intento.
      expect(response.body.payer_email).toBe('ana@example.com');
    });

    it('rechaza montos con más de dos decimales', async () => {
      const response = await request(app)
        .post(CHARGES_URL)
        .send(buildChargeRequest({ transaction_amount: 10.001 }));

      expect(response.status).toBe(400);
      expect(response.body.errors[0].field).toBe('transaction_amount');
    });

    it('rechaza solicitudes sin pagador', async () => {
      const { payer: _payer, ...withoutPayer } = buildChargeRequest();

      const response = await request(app).post(CHARGES_URL).send(withoutPayer);

      expect(response.status).toBe(400);
      expect(response.body.payer_id).toBeNull();
      expect(response.body.errors.map((error: { field: string }) => error.field)).toContain('payer');
    });

    it('rechaza campos no esperados', async () => {
      const response = await request(app)
        .post(CHARGES_URL)
        .send({ ...buildChargeRequest(), approved: true });

      expect(response.status).toBe(400);
    });

    it('responde con el contrato de SnailPay cuando el JSON está mal formado', async () => {
      const response = await request(app)
        .post(CHARGES_URL)
        .set('Content-Type', 'application/json')
        .send('{"card_number": ');

      expect(response.status).toBe(400);
      expect(response.body.status_detail).toBe('invalid_request');
    });

    it('rechaza una llave de idempotencia con formato inválido', async () => {
      const response = await request(app)
        .post(CHARGES_URL)
        .set('Idempotency-Key', 'corta')
        .send(buildChargeRequest());

      expect(response.status).toBe(400);
      expect(response.body.errors[0].field).toBe('Idempotency-Key');
    });
  });

  describe('errores del sistema', () => {
    it('responde 500 con la tarjeta de error interno y no autoriza nada', async () => {
      const response = await request(app)
        .post(CHARGES_URL)
        .send(buildChargeRequest({ card_number: '9999999999999999' }));

      expect(response.status).toBe(500);
      expectContractFields(response.body);
      expect(response.body).toMatchObject({
        status: 'error',
        status_detail: 'internal_error',
        authorization_code: null,
      });
    });

    it('responde 503 a cualquier solicitud cuando la caída está activada, incluso con la tarjeta válida', async () => {
      const downApp = createApp(buildTestConfig({ simulateOutage: true }));

      const response = await request(downApp).post(CHARGES_URL).send(buildChargeRequest());

      expect(response.status).toBe(503);
      expectContractFields(response.body);
      expect(response.body).toMatchObject({
        status: 'error',
        status_detail: 'service_unavailable',
        authorization_code: null,
      });

      const health = await request(downApp).get('/api/snailpay/health');
      expect(health.status).toBe(503);
    });

    it('responde 504 después del retardo configurado con la tarjeta de timeout', async () => {
      const delay = vi.fn().mockResolvedValue(undefined);
      const slowApp = createApp(buildTestConfig({ slowResponseMs: 15_000 }), { snailPay: { delay } });

      const response = await request(slowApp)
        .post(CHARGES_URL)
        .send(buildChargeRequest({ card_number: '4444444444444444' }));

      expect(delay).toHaveBeenCalledWith(15_000);
      expect(response.status).toBe(504);
      expect(response.body.status_detail).toBe('processor_timeout');
    });
  });

  describe('idempotencia', () => {
    it('repite la respuesta original cuando se reenvía la misma solicitud', async () => {
      const idempotentApp = createApp(buildTestConfig());
      const payload = buildChargeRequest();

      const first = await request(idempotentApp)
        .post(CHARGES_URL)
        .set('Idempotency-Key', 'key-duplicate-001')
        .send(payload);
      const second = await request(idempotentApp)
        .post(CHARGES_URL)
        .set('Idempotency-Key', 'key-duplicate-001')
        .send(payload);

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(second.body.id).toBe(first.body.id);
      expect(second.headers['idempotent-replayed']).toBe('true');
    });

    it('responde 409 cuando la misma llave se usa con otro cuerpo', async () => {
      const idempotentApp = createApp(buildTestConfig());

      await request(idempotentApp)
        .post(CHARGES_URL)
        .set('Idempotency-Key', 'key-conflict-001')
        .send(buildChargeRequest());
      const conflict = await request(idempotentApp)
        .post(CHARGES_URL)
        .set('Idempotency-Key', 'key-conflict-001')
        .send(buildChargeRequest({ transaction_amount: 999 }));

      expect(conflict.status).toBe(409);
      expect(conflict.body.status_detail).toBe('idempotency_key_conflict');
      expect(conflict.body.authorization_code).toBeNull();
    });

    it('permite reintentar con la misma llave después de un error del sistema', async () => {
      const idempotentApp = createApp(buildTestConfig());
      const failing = buildChargeRequest({ card_number: '9999999999999999' });

      const first = await request(idempotentApp)
        .post(CHARGES_URL)
        .set('Idempotency-Key', 'key-retry-001')
        .send(failing);
      const retry = await request(idempotentApp)
        .post(CHARGES_URL)
        .set('Idempotency-Key', 'key-retry-001')
        .send(failing);

      expect(first.status).toBe(500);
      expect(retry.status).toBe(500);
      expect(retry.body.id).not.toBe(first.body.id);
    });
  });

  it('limita la cantidad de solicitudes por minuto', async () => {
    const limitedApp = createApp(buildTestConfig({}, 2));

    await request(limitedApp).post(CHARGES_URL).send(buildChargeRequest());
    await request(limitedApp).post(CHARGES_URL).send(buildChargeRequest());
    const limited = await request(limitedApp).post(CHARGES_URL).send(buildChargeRequest());

    expect(limited.status).toBe(429);
    expect(limited.body.status_detail).toBe('too_many_requests');
  });
});

describe('otras rutas', () => {
  const app = createApp(buildTestConfig());

  it('expone un health check', async () => {
    const response = await request(app).get('/api/snailpay/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('responde 404 en rutas inexistentes', async () => {
    const response = await request(app).get('/api/no-existe');
    expect(response.status).toBe(404);
  });
});
