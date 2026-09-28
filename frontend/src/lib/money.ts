/**
 * El saldo se maneja en centavos (enteros) para evitar errores de punto flotante
 * al sumar recargas (0.1 + 0.2 !== 0.3).
 */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
});

export function formatCents(cents: number): string {
  return currencyFormatter.format(fromCents(cents));
}

export function formatAmount(amount: number): string {
  return currencyFormatter.format(amount);
}
