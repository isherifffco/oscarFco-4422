import { describe, expect, it, vi } from 'vitest';
import { buildChargeRequest, buildChargeResponse, jsonResponse } from '@/test/fixtures';
import { createCharge } from './snailPayClient';

const OPTIONS = { idempotencyKey: 'test-key-0001', baseUrl: '/api', timeoutMs: 1_000 };

describe('createCharge', () => {
  it('envía la solicitud con la llave de idempotencia y reconoce un cobro aprobado', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(201, buildChargeResponse()));

    const result = await createCharge(buildChargeRequest(), { ...OPTIONS, fetchFn });

    expect(result.kind).toBe('approved');
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/snailpay/charges');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toBe('test-key-0001');
    expect(JSON.parse(init.body as string)).toEqual(buildChargeRequest());
  });

  it('clasifica un rechazo de negocio', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse(
        402,
        buildChargeResponse({ status: 'rejected', status_detail: 'cc_rejected_high_risk', authorization_code: null }),
      ),
    );

    const result = await createCharge(buildChargeRequest(), { ...OPTIONS, fetchFn });

    expect(result).toMatchObject({ kind: 'rejected', httpStatus: 402 });
  });

  it('clasifica un error del sistema aunque la respuesta no sea JSON', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('Bad Gateway', { status: 502 }));

    const result = await createCharge(buildChargeRequest(), { ...OPTIONS, fetchFn });

    expect(result).toEqual({ kind: 'system_error', httpStatus: 502, charge: null });
  });

  it.each([
    ['el monto no coincide', buildChargeResponse({ transaction_amount: 999 }), 201],
    ['el pagador no coincide', buildChargeResponse({ payer_id: 'otro-usuario' }), 201],
    ['falta el código de autorización', buildChargeResponse({ authorization_code: null }), 201],
    ['el HTTP no es 201', buildChargeResponse(), 200],
  ])('no acepta una aprobación cuando %s (evita falsos cobros exitosos)', async (_case, body, status) => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(status, body));

    const result = await createCharge(buildChargeRequest(), { ...OPTIONS, fetchFn });

    expect(result.kind).toBe('invalid_response');
  });

  it('trata como inválida una respuesta que no cumple el contrato', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(201, { status: 'approved' }));

    const result = await createCharge(buildChargeRequest(), { ...OPTIONS, fetchFn });

    expect(result.kind).toBe('invalid_response');
  });

  it('detecta errores de red', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await createCharge(buildChargeRequest(), { ...OPTIONS, fetchFn });

    expect(result).toEqual({ kind: 'network_error' });
  });

  it('aborta la solicitud cuando se supera el tiempo máximo', async () => {
    const fetchFn = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );

    const result = await createCharge(buildChargeRequest(), { ...OPTIONS, timeoutMs: 20, fetchFn });

    expect(result).toEqual({ kind: 'timeout' });
  });

  it('distingue una cancelación del usuario de un timeout', async () => {
    const controller = new AbortController();
    const fetchFn = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );

    const pending = createCharge(buildChargeRequest(), { ...OPTIONS, fetchFn, signal: controller.signal });
    controller.abort();

    await expect(pending).resolves.toEqual({ kind: 'cancelled' });
  });
});
