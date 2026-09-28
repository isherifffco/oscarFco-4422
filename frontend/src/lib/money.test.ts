import { describe, expect, it } from 'vitest';
import { formatCents, toCents } from './money';

describe('money', () => {
  it('convierte a centavos sin errores de punto flotante', () => {
    expect(toCents(0.1) + toCents(0.2)).toBe(30);
    expect(toCents(250.5)).toBe(25_050);
    expect(toCents(19.99)).toBe(1_999);
  });

  it('formatea en pesos mexicanos', () => {
    expect(formatCents(0)).toBe('$0.00');
    expect(formatCents(1_234_550)).toBe('$12,345.50');
  });
});
