import type { RequestHandler } from 'express';

/**
 * Registra método, ruta, estado y duración.
 * Nunca registra cuerpos ni encabezados: las solicitudes de cobro contienen datos de tarjeta.
 */
export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    console.info(`${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} ${elapsedMs.toFixed(1)}ms`);
  });

  next();
};
