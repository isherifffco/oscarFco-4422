function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  snailPayTimeoutMs: readPositiveInt(import.meta.env.VITE_SNAILPAY_TIMEOUT_MS, 10_000),
  sessionDurationMs: 8 * 60 * 60 * 1000,
} as const;
