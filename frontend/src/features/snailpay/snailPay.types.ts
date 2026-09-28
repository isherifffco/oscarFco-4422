import { z } from 'zod';

/** Contrato de respuesta de SnailPay (ver docs/SNAILPAY.md). Se valida antes de usarse. */
export const chargeResponseSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['approved', 'rejected', 'error']),
  status_detail: z.string().min(1),
  transaction_amount: z.number().nullable(),
  currency_id: z.string(),
  date_created: z.iso.datetime(),
  authorization_code: z.string().nullable(),
  reference: z.string().min(1),
  payer_id: z.string().nullable(),
  payer_email: z.string().nullable(),
  card: z
    .object({
      number: z.string(),
      cvv: z.string(),
      expiration_date: z.string(),
      holder_name: z.string(),
    })
    .nullable(),
  errors: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
});

export type ChargeResponse = z.infer<typeof chargeResponseSchema>;

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

/**
 * Resultado de un intento de cobro desde el punto de vista del cliente.
 * Solo `approved` modifica el saldo.
 */
export type ChargeAttemptResult =
  | { kind: 'approved'; httpStatus: number; charge: ChargeResponse }
  | { kind: 'rejected'; httpStatus: number; charge: ChargeResponse }
  | { kind: 'system_error'; httpStatus: number; charge: ChargeResponse | null }
  | { kind: 'invalid_response'; httpStatus: number | null; charge: ChargeResponse | null }
  | { kind: 'timeout' }
  | { kind: 'network_error' }
  | { kind: 'cancelled' };

export type RecordableChargeAttempt = Exclude<ChargeAttemptResult, { kind: 'cancelled' }>;
