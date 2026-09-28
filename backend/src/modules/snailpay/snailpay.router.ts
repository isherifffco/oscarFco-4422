import { createHash } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import express, {
  Router,
  type ErrorRequestHandler,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import { rateLimit } from 'express-rate-limit';
import type { AppConfig } from '../../config/env.js';
import { IdempotencyStore } from './idempotency.store.js';
import {
  chargeRequestSchema,
  idempotencyKeySchema,
  toFieldErrors,
  type ParsedChargeRequest,
} from './snailpay.schema.js';
import {
  createChargeResponseBuilder,
  evaluateCharge,
  type ChargeResponseBuilder,
  type ChargeResponseInput,
} from './snailpay.service.js';
import type { ChargeResponse } from './snailpay.types.js';

export interface SnailPayRouterDeps {
  config: AppConfig['snailPay'];
  rateLimitPerMinute: number;
  idempotencyStore?: IdempotencyStore;
  buildResponse?: ChargeResponseBuilder;
  delay?: (ms: number) => Promise<void>;
}

const IDEMPOTENCY_HEADER = 'Idempotency-Key';

const HTTP_STATUS = {
  created: 201,
  badRequest: 400,
  paymentRequired: 402,
  conflict: 409,
  payloadTooLarge: 413,
  tooManyRequests: 429,
  internalError: 500,
  serviceUnavailable: 503,
  gatewayTimeout: 504,
} as const;

function fingerprintOf(request: ParsedChargeRequest): string {
  return createHash('sha256').update(JSON.stringify(request)).digest('hex');
}

/** Extrae, solo si son válidos, los datos que sirven para identificar una solicitud rechazada. */
function extractPartialData(body: unknown): NonNullable<ChargeResponseInput['partial']> {
  const source = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  const payer = (typeof source.payer === 'object' && source.payer !== null ? source.payer : {}) as Record<
    string,
    unknown
  >;
  const { shape } = chargeRequestSchema;
  const amount = shape.transaction_amount.safeParse(source.transaction_amount);
  const payerId = shape.payer.shape.id.safeParse(payer.id);
  const payerEmail = shape.payer.shape.email.safeParse(payer.email);

  return {
    transaction_amount: amount.success ? amount.data : null,
    payer_id: payerId.success ? payerId.data : null,
    payer_email: payerEmail.success ? payerEmail.data : null,
  };
}

function sendCharge(res: Response, httpStatus: number, body: ChargeResponse): void {
  res.status(httpStatus).json(body);
}

export function createSnailPayRouter(deps: SnailPayRouterDeps): Router {
  const store = deps.idempotencyStore ?? new IdempotencyStore();
  const buildResponse = deps.buildResponse ?? createChargeResponseBuilder();
  const delay = deps.delay ?? ((ms: number) => sleep(ms).then(() => undefined));

  const router = Router();
  router.use(express.json({ limit: '10kb' }));

  const chargesLimiter = rateLimit({
    windowMs: 60_000,
    limit: deps.rateLimitPerMinute,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
      sendCharge(
        res,
        HTTP_STATUS.tooManyRequests,
        buildResponse({ status: 'error', detail: 'too_many_requests', partial: extractPartialData(req.body) }),
      );
    },
  });

  router.get('/health', (_req, res) => {
    if (deps.config.simulateOutage) {
      res.status(HTTP_STATUS.serviceUnavailable).json({ status: 'unavailable' });
      return;
    }
    res.json({ status: 'ok' });
  });

  const createCharge: RequestHandler = async (req: Request, res: Response) => {
    const idempotencyKeyHeader = req.get(IDEMPOTENCY_HEADER);
    const parsed = chargeRequestSchema.safeParse(req.body);
    const request = parsed.success ? parsed.data : null;
    const partial = extractPartialData(req.body);

    // 1) Caída simulada del servicio: no se procesa ni se aprueba nada.
    if (deps.config.simulateOutage) {
      sendCharge(
        res,
        HTTP_STATUS.serviceUnavailable,
        buildResponse({ status: 'error', detail: 'service_unavailable', request, partial }),
      );
      return;
    }

    // 2) Validación de formato de la llave de idempotencia y del cuerpo.
    if (idempotencyKeyHeader !== undefined && !idempotencyKeySchema.safeParse(idempotencyKeyHeader).success) {
      sendCharge(
        res,
        HTTP_STATUS.badRequest,
        buildResponse({
          status: 'rejected',
          detail: 'invalid_request',
          partial,
          errors: [{ field: IDEMPOTENCY_HEADER, message: 'Debe tener entre 8 y 64 caracteres alfanuméricos' }],
        }),
      );
      return;
    }

    if (!parsed.success || !request) {
      sendCharge(
        res,
        HTTP_STATUS.badRequest,
        buildResponse({
          status: 'rejected',
          detail: 'invalid_request',
          partial,
          errors: parsed.success ? [] : toFieldErrors(parsed.error),
        }),
      );
      return;
    }

    // 3) Idempotencia: evita cobros duplicados por reintentos o doble clic.
    const idempotencyKey = idempotencyKeyHeader;
    const fingerprint = fingerprintOf(request);

    if (idempotencyKey) {
      const lookup = store.lookup(idempotencyKey, fingerprint);
      if (lookup.kind === 'replay') {
        res.setHeader('Idempotent-Replayed', 'true');
        sendCharge(res, lookup.httpStatus, lookup.body);
        return;
      }
      if (lookup.kind === 'conflict' || lookup.kind === 'in_progress') {
        sendCharge(
          res,
          HTTP_STATUS.conflict,
          buildResponse({
            status: 'rejected',
            detail: lookup.kind === 'conflict' ? 'idempotency_key_conflict' : 'request_in_progress',
            request,
          }),
        );
        return;
      }
      store.markInProgress(idempotencyKey, fingerprint);
    }

    try {
      // 4) Reglas del simulador.
      const outcome = evaluateCharge(request);

      switch (outcome.kind) {
        case 'approved': {
          const body = buildResponse({ status: 'approved', detail: 'accredited', request });
          if (idempotencyKey) store.complete(idempotencyKey, fingerprint, HTTP_STATUS.created, body);
          sendCharge(res, HTTP_STATUS.created, body);
          return;
        }
        case 'rejected': {
          const body = buildResponse({ status: 'rejected', detail: outcome.detail, request });
          if (idempotencyKey) store.complete(idempotencyKey, fingerprint, HTTP_STATUS.paymentRequired, body);
          sendCharge(res, HTTP_STATUS.paymentRequired, body);
          return;
        }
        case 'system_error': {
          if (idempotencyKey) store.release(idempotencyKey);
          sendCharge(
            res,
            HTTP_STATUS.internalError,
            buildResponse({ status: 'error', detail: outcome.detail, request }),
          );
          return;
        }
        case 'slow_timeout': {
          await delay(deps.config.slowResponseMs);
          if (idempotencyKey) store.release(idempotencyKey);
          if (res.headersSent || req.socket.destroyed) return;
          sendCharge(
            res,
            HTTP_STATUS.gatewayTimeout,
            buildResponse({ status: 'error', detail: 'processor_timeout', request }),
          );
          return;
        }
      }
    } catch (error) {
      if (idempotencyKey) store.release(idempotencyKey);
      throw error;
    }
  };

  router.post('/charges', chargesLimiter, createCharge);

  // Cualquier error dentro de SnailPay se responde con el mismo contrato de la API.
  const snailPayErrorHandler: ErrorRequestHandler = (error: unknown, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    const errorType = (error as { type?: string } | null)?.type;

    if (errorType === 'entity.parse.failed') {
      sendCharge(
        res,
        HTTP_STATUS.badRequest,
        buildResponse({
          status: 'rejected',
          detail: 'invalid_request',
          errors: [{ field: 'body', message: 'El cuerpo debe ser un JSON válido' }],
        }),
      );
      return;
    }

    if (errorType === 'entity.too.large') {
      sendCharge(
        res,
        HTTP_STATUS.payloadTooLarge,
        buildResponse({
          status: 'rejected',
          detail: 'invalid_request',
          errors: [{ field: 'body', message: 'El cuerpo excede el tamaño permitido' }],
        }),
      );
      return;
    }

    console.error(`[snailpay] Error inesperado en ${req.method} ${req.path}`, error);
    sendCharge(
      res,
      HTTP_STATUS.internalError,
      buildResponse({ status: 'error', detail: 'internal_error', partial: extractPartialData(req.body) }),
    );
  };

  router.use(snailPayErrorHandler);

  return router;
}
