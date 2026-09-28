import type { z } from 'zod';

const STORAGE_PREFIX = 'caracolDerby';

/** Todas las llaves de LocalStorage de la aplicación en un solo lugar. */
export const storageKeys = {
  users: `${STORAGE_PREFIX}:users`,
  session: `${STORAGE_PREFIX}:session`,
  loginThrottle: `${STORAGE_PREFIX}:loginThrottle`,
  wallet: (userId: string) => `${STORAGE_PREFIX}:wallet:${userId}`,
} as const;

export class StorageUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('No fue posible guardar la información en este navegador.', { cause });
    this.name = 'StorageUnavailableError';
  }
}

/**
 * Lee y valida un valor JSON. Si el dato no existe, está corrupto o fue
 * manipulado y no cumple el esquema, devuelve null en lugar de romper la app.
 */
export function readJson<T>(key: string, schema: z.ZodType<T>): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;

    const result = schema.safeParse(JSON.parse(raw));
    if (!result.success) {
      console.warn(`[storage] Se ignoró un valor inválido en "${key}".`);
      return null;
    }
    return result.data;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    throw new StorageUnavailableError(error);
  }
}

export function removeItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Si el almacenamiento no está disponible no hay nada que borrar.
  }
}
