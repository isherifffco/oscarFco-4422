import { z } from 'zod';

/**
 * Hash de contraseñas con PBKDF2-HMAC-SHA256 (Web Crypto API).
 * - Sal aleatoria de 16 bytes por usuario.
 * - 600 000 iteraciones (recomendación OWASP vigente para PBKDF2-SHA256).
 * - Comparación en tiempo constante.
 * La contraseña en texto plano nunca se guarda.
 */
export const PASSWORD_HASH_ALGORITHM = 'PBKDF2-SHA256';
export const DEFAULT_PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

export const passwordHashSchema = z.object({
  algorithm: z.literal(PASSWORD_HASH_ALGORITHM),
  iterations: z.number().int().positive(),
  salt: z.string().min(1),
  hash: z.string().min(1),
});

export type PasswordHash = z.infer<typeof passwordHashSchema>;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function deriveBits(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    keyMaterial,
    HASH_BITS,
  );
  return new Uint8Array(bits);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return diff === 0;
}

export async function hashPassword(
  password: string,
  iterations: number = DEFAULT_PBKDF2_ITERATIONS,
): Promise<PasswordHash> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await deriveBits(password, salt, iterations);

  return {
    algorithm: PASSWORD_HASH_ALGORITHM,
    iterations,
    salt: toBase64(salt),
    hash: toBase64(hash),
  };
}

export async function verifyPassword(password: string, stored: PasswordHash): Promise<boolean> {
  const candidate = await deriveBits(password, fromBase64(stored.salt), stored.iterations);
  return constantTimeEqual(candidate, fromBase64(stored.hash));
}
