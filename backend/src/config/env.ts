import { z } from 'zod';

const booleanFromString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  SNAILPAY_SIMULATE_OUTAGE: booleanFromString,
  SNAILPAY_SLOW_RESPONSE_MS: z.coerce.number().int().nonnegative().default(15_000),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(30),
});

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  corsOrigins: string[];
  snailPay: {
    /** Cuando es true, todas las solicitudes de cobro responden 503. */
    simulateOutage: boolean;
    /** Tiempo de respuesta de la tarjeta de prueba de timeout. */
    slowResponseMs: number;
  };
  rateLimitPerMinute: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Configuración inválida: ${issues}`);
  }

  const values = parsed.data;

  return {
    nodeEnv: values.NODE_ENV,
    port: values.PORT,
    corsOrigins: values.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    snailPay: {
      simulateOutage: values.SNAILPAY_SIMULATE_OUTAGE,
      slowResponseMs: values.SNAILPAY_SLOW_RESPONSE_MS,
    },
    rateLimitPerMinute: values.RATE_LIMIT_PER_MINUTE,
  };
}
