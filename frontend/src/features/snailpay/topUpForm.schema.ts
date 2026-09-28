import { z } from 'zod';

/** Límite de formato que acepta el API. El límite de negocio por recarga lo decide SnailPay. */
export const MAX_TOP_UP_INPUT = 1_000_000;

export const topUpFormSchema = z.object({
  cardNumber: z
    .string()
    .transform((value) => value.replace(/\s+/g, ''))
    .pipe(z.string().regex(/^\d{16}$/, 'El número de tarjeta debe tener 16 dígitos')),
  expirationDate: z
    .string()
    .trim()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Usa el formato MM/AA con un mes válido'),
  cvv: z.string().trim().regex(/^\d{3}$/, 'El CVV debe tener 3 dígitos'),
  holderName: z
    .string()
    .trim()
    .min(1, 'Ingresa el nombre como aparece en la tarjeta')
    .max(100, 'El nombre debe tener como máximo 100 caracteres'),
  amount: z
    .string()
    .trim()
    .min(1, 'Ingresa el monto a recargar')
    .regex(/^\d+(\.\d{1,2})?$/, 'Ingresa un monto válido (máximo 2 decimales, sin comas)')
    .transform(Number)
    .pipe(
      z
        .number()
        .positive('El monto debe ser mayor que cero')
        .max(MAX_TOP_UP_INPUT, 'El monto es demasiado grande'),
    ),
});

export type TopUpFormInput = z.input<typeof topUpFormSchema>;
export type TopUpFormValues = z.output<typeof topUpFormSchema>;

/** "1234123412341234" -> "1234 1234 1234 1234" (máximo 16 dígitos). */
export function formatCardNumberInput(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
}

/** "1226" -> "12/26" (máximo 4 dígitos). */
export function formatExpirationInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

export function maskCardNumber(cardNumber: string): string {
  return `•••• ${cardNumber.slice(-4)}`;
}
