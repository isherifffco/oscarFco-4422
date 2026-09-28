import type { ErrorRequestHandler, RequestHandler } from 'express';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: 'not_found', message: 'Recurso no encontrado' } });
};

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  console.error('[api] Error no controlado', error);
  res.status(500).json({ error: { code: 'internal_error', message: 'Error interno del servidor' } });
};
