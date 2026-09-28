import { describe, expect, it } from 'vitest';
import { formatCardNumberInput, formatExpirationInput, maskCardNumber, topUpFormSchema } from './topUpForm.schema';

const VALID = {
  cardNumber: '1234 1234 1234 1234',
  expirationDate: '12/26',
  cvv: '543',
  holderName: 'Ana Pérez',
  amount: '250.50',
};

describe('topUpFormSchema', () => {
  it('normaliza los datos para el API', () => {
    expect(topUpFormSchema.parse(VALID)).toEqual({
      cardNumber: '1234123412341234',
      expirationDate: '12/26',
      cvv: '543',
      holderName: 'Ana Pérez',
      amount: 250.5,
    });
  });

  it.each([
    ['tarjeta incompleta', { cardNumber: '1234 1234' }],
    ['mes inválido', { expirationDate: '13/26' }],
    ['CVV de 2 dígitos', { cvv: '54' }],
    ['nombre vacío', { holderName: '   ' }],
    ['monto cero', { amount: '0' }],
    ['monto con 3 decimales', { amount: '10.001' }],
    ['monto con comas', { amount: '1,000' }],
    ['monto negativo', { amount: '-5' }],
  ])('rechaza %s', (_case, values) => {
    expect(topUpFormSchema.safeParse({ ...VALID, ...values }).success).toBe(false);
  });
});

describe('formateadores', () => {
  it('agrupa el número de tarjeta en bloques de 4 y limita a 16 dígitos', () => {
    expect(formatCardNumberInput('12341234abc12341234999')).toBe('1234 1234 1234 1234');
  });

  it('agrega la diagonal en la fecha de vencimiento', () => {
    expect(formatExpirationInput('1')).toBe('1');
    expect(formatExpirationInput('122')).toBe('12/2');
    expect(formatExpirationInput('12/267')).toBe('12/26');
  });

  it('enmascara la tarjeta mostrando solo los últimos 4 dígitos', () => {
    expect(maskCardNumber('1234123412345678')).toBe('•••• 5678');
  });
});
