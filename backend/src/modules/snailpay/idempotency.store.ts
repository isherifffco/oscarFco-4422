import type { ChargeResponse } from './snailpay.types.js';

interface CompletedEntry {
  state: 'completed';
  fingerprint: string;
  httpStatus: number;
  body: ChargeResponse;
  expiresAt: number;
}

interface InProgressEntry {
  state: 'in_progress';
  fingerprint: string;
  expiresAt: number;
}

type IdempotencyEntry = CompletedEntry | InProgressEntry;

export type IdempotencyLookup =
  | { kind: 'miss' }
  | { kind: 'replay'; httpStatus: number; body: ChargeResponse }
  | { kind: 'conflict' }
  | { kind: 'in_progress' };

export interface IdempotencyStoreOptions {
  ttlMs?: number;
  maxEntries?: number;
  now?: () => number;
}

/**
 * Almacén en memoria de llaves de idempotencia.
 * Evita que un doble clic o un reintento del cliente genere dos cobros:
 * la misma llave con el mismo cuerpo devuelve la respuesta original.
 */
export class IdempotencyStore {
  private readonly entries = new Map<string, IdempotencyEntry>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly now: () => number;

  constructor(options: IdempotencyStoreOptions = {}) {
    this.ttlMs = options.ttlMs ?? 24 * 60 * 60 * 1000;
    this.maxEntries = options.maxEntries ?? 10_000;
    this.now = options.now ?? Date.now;
  }

  lookup(key: string, fingerprint: string): IdempotencyLookup {
    const entry = this.getLiveEntry(key);

    if (!entry) return { kind: 'miss' };
    if (entry.fingerprint !== fingerprint) return { kind: 'conflict' };
    if (entry.state === 'in_progress') return { kind: 'in_progress' };

    return { kind: 'replay', httpStatus: entry.httpStatus, body: entry.body };
  }

  markInProgress(key: string, fingerprint: string): void {
    this.evictIfFull();
    this.entries.set(key, {
      state: 'in_progress',
      fingerprint,
      expiresAt: this.now() + this.ttlMs,
    });
  }

  complete(key: string, fingerprint: string, httpStatus: number, body: ChargeResponse): void {
    this.entries.set(key, {
      state: 'completed',
      fingerprint,
      httpStatus,
      body,
      expiresAt: this.now() + this.ttlMs,
    });
  }

  /** Libera la llave para permitir reintentos (se usa cuando falla el sistema). */
  release(key: string): void {
    this.entries.delete(key);
  }

  private getLiveEntry(key: string): IdempotencyEntry | undefined {
    const entry = this.entries.get(key);
    if (entry && entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry;
  }

  private evictIfFull(): void {
    if (this.entries.size < this.maxEntries) return;
    const oldestKey = this.entries.keys().next().value;
    if (oldestKey !== undefined) this.entries.delete(oldestKey);
  }
}
