import { appConfig } from '@/config';
import {
  chargeResponseSchema,
  type ChargeAttemptResult,
  type ChargeRequest,
  type ChargeResponse,
} from './snailPay.types';

export interface CreateChargeOptions {
  idempotencyKey: string;
  timeoutMs?: number;
  /** Permite cancelar la solicitud (por ejemplo, al desmontar el componente). */
  signal?: AbortSignal;
  fetchFn?: typeof fetch;
  baseUrl?: string;
}

const HTTP_CREATED = 201;

/**
 * Un cobro solo se considera aprobado si TODA la respuesta es coherente con lo solicitado.
 * Cualquier inconsistencia se trata como respuesta inválida y no modifica el saldo,
 * para no generar falsos cobros exitosos.
 */
function classifyResponse(
  httpStatus: number,
  charge: ChargeResponse,
  request: ChargeRequest,
): ChargeAttemptResult {
  if (charge.status === 'approved') {
    const isConsistent =
      httpStatus === HTTP_CREATED &&
      charge.status_detail === 'accredited' &&
      Boolean(charge.authorization_code) &&
      charge.transaction_amount === request.transaction_amount &&
      charge.payer_id === request.payer.id &&
      charge.payer_email === request.payer.email;

    return isConsistent
      ? { kind: 'approved', httpStatus, charge }
      : { kind: 'invalid_response', httpStatus, charge };
  }

  if (charge.status === 'error' || httpStatus >= 500) {
    return { kind: 'system_error', httpStatus, charge };
  }

  return { kind: 'rejected', httpStatus, charge };
}

async function readJsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export async function createCharge(
  request: ChargeRequest,
  {
    idempotencyKey,
    timeoutMs = appConfig.snailPayTimeoutMs,
    signal,
    fetchFn = fetch,
    baseUrl = appConfig.apiBaseUrl,
  }: CreateChargeOptions,
): Promise<ChargeAttemptResult> {
  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener('abort', abortFromCaller, { once: true });

  try {
    const response = await fetchFn(`${baseUrl}/snailpay/charges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    const payload = await readJsonBody(response);

    if (timedOut) return { kind: 'timeout' };
    if (controller.signal.aborted) return { kind: 'cancelled' };

    const parsed = chargeResponseSchema.safeParse(payload);
    if (!parsed.success) {
      return response.status >= 500
        ? { kind: 'system_error', httpStatus: response.status, charge: null }
        : { kind: 'invalid_response', httpStatus: response.status, charge: null };
    }

    return classifyResponse(response.status, parsed.data, request);
  } catch {
    if (timedOut) return { kind: 'timeout' };
    if (controller.signal.aborted) return { kind: 'cancelled' };
    return { kind: 'network_error' };
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}
