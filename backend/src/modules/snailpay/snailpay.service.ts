import { randomBytes, randomUUID } from 'node:crypto';
import {
  APPROVED_TEST_CARD,
  MAX_AMOUNT_PER_CHARGE,
  REJECTED_TEST_CARDS,
  SYSTEM_ERROR_TEST_CARD,
  TIMEOUT_TEST_CARD,
} from './snailpay.scenarios.js';
import type { ParsedChargeRequest } from './snailpay.schema.js';
import type {
  ChargeOutcome,
  ChargeResponse,
  ChargeStatus,
  FieldError,
  StatusDetail,
} from './snailpay.types.js';

/**
 * Reglas del simulador. Es una función pura: dada una solicitud válida
 * devuelve siempre el mismo resultado, lo que facilita las pruebas y la documentación.
 */
export function evaluateCharge(request: ParsedChargeRequest): ChargeOutcome {
  const { card_number: cardNumber } = request;

  if (cardNumber === SYSTEM_ERROR_TEST_CARD) {
    return { kind: 'system_error', detail: 'internal_error' };
  }

  if (cardNumber === TIMEOUT_TEST_CARD) {
    return { kind: 'slow_timeout' };
  }

  const predefinedRejection = REJECTED_TEST_CARDS[cardNumber];
  if (predefinedRejection) {
    return { kind: 'rejected', detail: predefinedRejection };
  }

  if (cardNumber !== APPROVED_TEST_CARD.number) {
    return { kind: 'rejected', detail: 'cc_rejected_unknown_card' };
  }

  if (request.expiration_date !== APPROVED_TEST_CARD.expirationDate) {
    return { kind: 'rejected', detail: 'cc_rejected_bad_filled_date' };
  }

  if (request.cvv !== APPROVED_TEST_CARD.cvv) {
    return { kind: 'rejected', detail: 'cc_rejected_bad_filled_security_code' };
  }

  if (request.transaction_amount > MAX_AMOUNT_PER_CHARGE) {
    return { kind: 'rejected', detail: 'cc_rejected_max_amount' };
  }

  return { kind: 'approved' };
}

export interface ChargeResponseInput {
  status: ChargeStatus;
  detail: StatusDetail;
  request?: ParsedChargeRequest | null;
  partial?: Pick<ChargeResponse, 'transaction_amount' | 'payer_id' | 'payer_email'>;
  errors?: FieldError[];
}

export interface SnailPayIdentityGenerator {
  now(): Date;
  operationId(): string;
  reference(date: Date): string;
  authorizationCode(): string;
}

const ALPHANUMERIC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(length: number): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => ALPHANUMERIC[byte % ALPHANUMERIC.length]).join('');
}

export const defaultIdentityGenerator: SnailPayIdentityGenerator = {
  now: () => new Date(),
  operationId: () => `chg_${randomUUID()}`,
  reference: (date) => {
    const day = date.toISOString().slice(0, 10).replaceAll('-', '');
    return `SNP-${day}-${randomCode(6)}`;
  },
  authorizationCode: () => randomCode(6),
};

export function createChargeResponseBuilder(
  identity: SnailPayIdentityGenerator = defaultIdentityGenerator,
) {
  return function buildChargeResponse(input: ChargeResponseInput): ChargeResponse {
    const createdAt = identity.now();
    const { request } = input;

    const response: ChargeResponse = {
      id: identity.operationId(),
      status: input.status,
      status_detail: input.detail,
      transaction_amount: request?.transaction_amount ?? input.partial?.transaction_amount ?? null,
      currency_id: 'MXN',
      date_created: createdAt.toISOString(),
      authorization_code: input.status === 'approved' ? identity.authorizationCode() : null,
      reference: identity.reference(createdAt),
      payer_id: request?.payer.id ?? input.partial?.payer_id ?? null,
      payer_email: request?.payer.email ?? input.partial?.payer_email ?? null,
      card: request
        ? {
            number: request.card_number,
            cvv: request.cvv,
            expiration_date: request.expiration_date,
            holder_name: request.holder_name,
          }
        : null,
    };

    if (input.errors && input.errors.length > 0) {
      response.errors = input.errors;
    }

    return response;
  };
}

export type ChargeResponseBuilder = ReturnType<typeof createChargeResponseBuilder>;
