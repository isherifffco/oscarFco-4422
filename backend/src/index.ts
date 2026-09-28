import { createApp } from './app.js';
import { loadConfig } from './config/env.js';

// Carga backend/.env si existe (Node >= 20.12). Las variables ya definidas tienen prioridad.
try {
  process.loadEnvFile();
} catch {
  // Sin archivo .env: se usan los valores por defecto.
}

const config = loadConfig();
const app = createApp(config);

const server = app.listen(config.port, () => {
  console.info(`SnailPay API escuchando en http://localhost:${config.port}`);
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
