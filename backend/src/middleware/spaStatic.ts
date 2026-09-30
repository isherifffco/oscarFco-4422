import path from 'node:path';
import express, { Router } from 'express';

/**
 * Sirve el build del frontend (SPA) desde el mismo servidor que el API.
 * Así el despliegue es un solo servicio y el frontend llama a /api sin CORS.
 */
export function createSpaStaticRouter(staticDir: string): Router {
  const root = path.resolve(staticDir);
  const router = Router();

  // Los archivos de Vite llevan hash en el nombre: se pueden cachear de forma indefinida.
  router.use('/assets', express.static(path.join(root, 'assets'), { immutable: true, maxAge: '1y' }));
  router.use(express.static(root, { index: false, maxAge: '1h' }));

  // Cualquier otra ruta de navegación (/login, /dashboard...) devuelve index.html y React Router decide.
  router.use((req, res, next) => {
    const isNavigation = (req.method === 'GET' || req.method === 'HEAD') && path.extname(req.path) === '';
    if (!isNavigation || req.path === '/api' || req.path.startsWith('/api/')) {
      next();
      return;
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile('index.html', { root });
  });

  return router;
}
