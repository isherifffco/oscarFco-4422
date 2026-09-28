import type { RejectedDetail } from './snailpay.types.js';

/**
 * Datos de prueba documentados en docs/SNAILPAY.md.
 * Todos son ficticios; SnailPay no se conecta con ningún procesador real.
 */
export const APPROVED_TEST_CARD = {
  number: '1234123412341234',
  expirationDate: '12/26',
  cvv: '543',
} as const;

/** Tarjetas que siempre son rechazadas con un motivo específico. */
export const REJECTED_TEST_CARDS: Readonly<Record<string, RejectedDetail>> = {
  '4000000000000002': 'cc_rejected_insufficient_amount',
  '4000000000000069': 'cc_rejected_card_disabled',
  '4000000000000119': 'cc_rejected_high_risk',
};

/** Provoca un error interno (HTTP 500) en una sola solicitud. */
export const SYSTEM_ERROR_TEST_CARD = '9999999999999999';

/** Responde después de SNAILPAY_SLOW_RESPONSE_MS con HTTP 504 para probar el timeout del cliente. */
export const TIMEOUT_TEST_CARD = '4444444444444444';

/** Monto máximo permitido por recarga. Montos mayores son rechazados. */
export const MAX_AMOUNT_PER_CHARGE = 10_000;

/** Monto máximo que acepta el contrato del API (validación de formato). */
export const MAX_REQUEST_AMOUNT = 1_000_000;
