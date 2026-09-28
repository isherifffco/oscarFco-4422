export type ChargeStatus = 'approved' | 'rejected' | 'error';

/** Detalles posibles para un cobro aprobado. */
export type ApprovedDetail = 'accredited';

/** Rechazos de negocio (la tarjeta o los datos no permiten el cobro). HTTP 402. */
export type RejectedDetail =
  | 'cc_rejected_bad_filled_security_code'
  | 'cc_rejected_bad_filled_date'
  | 'cc_rejected_insufficient_amount'
  | 'cc_rejected_card_disabled'
  | 'cc_rejected_high_risk'
  | 'cc_rejected_max_amount'
  | 'cc_rejected_unknown_card';

/** Errores de la solicitud (formato inválido o reutilización de llave). HTTP 400 / 409. */
export type RequestErrorDetail =
  | 'invalid_request'
  | 'idempotency_key_conflict'
  | 'request_in_progress'
  | 'too_many_requests';

/** Fallas internas de SnailPay. HTTP 5xx. */
export type SystemErrorDetail = 'internal_error' | 'service_unavailable' | 'processor_timeout';

export type StatusDetail = ApprovedDetail | RejectedDetail | RequestErrorDetail | SystemErrorDetail;

export interface FieldError {
  field: string;
  message: string;
}

/**
 * Datos de tarjeta devueltos por el servicio.
 * El requerimiento pide incluir número y CVV en la respuesta: son SIEMPRE datos ficticios de prueba.
 */
export interface ChargeCard {
  number: string;
  cvv: string;
  expiration_date: string;
  holder_name: string;
}

export interface ChargeResponse {
  id: string;
  status: ChargeStatus;
  status_detail: StatusDetail;
  transaction_amount: number | null;
  currency_id: 'MXN';
  date_created: string;
  authorization_code: string | null;
  reference: string;
  payer_id: string | null;
  payer_email: string | null;
  card: ChargeCard | null;
  errors?: FieldError[];
}

export interface ChargeRequest {
  card_number: string;
  expiration_date: string;
  cvv: string;
  holder_name: string;
  transaction_amount: number;
  payer: {
    id: string;
    email: string;
  };
}

/** Resultado de evaluar una solicitud válida contra las reglas del simulador. */
export type ChargeOutcome =
  | { kind: 'approved' }
  | { kind: 'rejected'; detail: RejectedDetail }
  | { kind: 'system_error'; detail: 'internal_error' }
  | { kind: 'slow_timeout' };
