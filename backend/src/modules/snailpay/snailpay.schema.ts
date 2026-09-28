import { z } from 'zod';
import { MAX_REQUEST_AMOUNT } from './snailpay.scenarios.js';
import type { FieldError } from './snailpay.types.js';

const hasAtMostTwoDecimals = (value: number): boolean => {
  const cents = value * 100;
  return Math.abs(cents - Math.round(cents)) < 1e-6;
};

export const chargeRequestSchema = z
  .object({
    card_number: z.string().regex(/^\d{16}$/, 'Debe contener exactamente 16 dígitos'),
    expiration_date: z
      .string()
      .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Debe tener el formato MM/AA'),
    cvv: z.string().regex(/^\d{3}$/, 'Debe contener exactamente 3 dígitos'),
    holder_name: z
      .string()
      .trim()
      .min(1, 'Es obligatorio')
      .max(100, 'Debe tener como máximo 100 caracteres'),
    transaction_amount: z
      .number({ error: 'Debe ser un número' })
      .positive('Debe ser mayor que cero')
      .max(MAX_REQUEST_AMOUNT, `Debe ser menor o igual a ${MAX_REQUEST_AMOUNT}`)
      .refine(hasAtMostTwoDecimals, 'Debe tener como máximo 2 decimales'),
    payer: z
      .object({
        id: z
          .string()
          .regex(/^[A-Za-z0-9_-]{1,64}$/, 'Debe ser un identificador válido'),
        email: z.email('Debe ser un correo válido').max(254),
      })
      .strict(),
  })
  .strict();

export type ParsedChargeRequest = z.infer<typeof chargeRequestSchema>;

export function toFieldErrors(error: z.ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : 'body',
    message: issue.message,
  }));
}

/** Llave de idempotencia: 8 a 64 caracteres seguros para URL. */
export const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/);
