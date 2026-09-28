export function createId(): string {
  return crypto.randomUUID();
}

/** Token aleatorio de 32 bytes en hexadecimal. */
export function createToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Llave de idempotencia compatible con el formato que exige SnailPay (8-64 caracteres). */
export function createIdempotencyKey(): string {
  return crypto.randomUUID().replaceAll('-', '');
}
