import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { loadConfig, type AppConfig } from './config/env.js';

// Carga backend/.env si existe (Node >= 20.12). Las variables ya definidas tienen prioridad.
try {
  process.loadEnvFile();
} catch {
  // Sin archivo .env: se usan los valores por defecto.
}

/** En producción, si existe frontend/dist, se sirve junto con el API aunque no se defina STATIC_DIR. */
function resolveStaticDir(config: AppConfig): string | null {
  if (config.staticDir) return config.staticDir;
  if (config.nodeEnv !== 'production') return null;
  const frontendDist = fileURLToPath(new URL('../../frontend/dist', import.meta.url));
  return existsSync(frontendDist) ? frontendDist : null;
}

const loadedConfig = loadConfig();
const config: AppConfig = { ...loadedConfig, staticDir: resolveStaticDir(loadedConfig) };
const app = createApp(config);

const server = app.listen(config.port, () => {
  console.info(`SnailPay API escuchando en http://localhost:${config.port}`);
  if (config.staticDir) {
    console.info(`Sirviendo el frontend desde ${config.staticDir}`);
  }
  if (config.snailPay.simulateOutage) {
    console.warn('SNAILPAY_SIMULATE_OUTAGE=true: todas las solicitudes de cobro responderán 503.');
  }
});

function shutdown(signal: string): void {
  console.info(`${signal} recibido, cerrando servidor...`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
