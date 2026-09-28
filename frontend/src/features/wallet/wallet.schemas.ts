import { z } from 'zod';
import { chargeResponseSchema } from '@/features/snailpay/snailPay.types';

export const TOP_UP_OUTCOMES = [
  'approved',
  'rejected',
  'system_error',
  'invalid_response',
  'timeout',
  'network_error',
] as const;

export const topUpRecordSchema = z.object({
  id: z.string().min(1),
  createdAt: z.iso.datetime(),
  requestedAmountCents: z.number().int().positive(),
  outcome: z.enum(TOP_UP_OUTCOMES),
  appliedToBalance: z.boolean(),
  /**
   * Respuesta completa de SnailPay. Por requerimiento incluye número de tarjeta y CVV,
   * que siempre son datos ficticios de prueba.
   */
  response: chargeResponseSchema.nullable(),
});

export type TopUpRecord = z.infer<typeof topUpRecordSchema>;

export const walletSchema = z.object({
  balanceCents: z.number().int().nonnegative(),
  topUps: z.array(topUpRecordSchema),
});

export type Wallet = z.infer<typeof walletSchema>;
