import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { buildTestConfig } from './helpers.js';

describe('servir el frontend (despliegue en un solo servicio)', () => {
  const staticDir = mkdtempSync(path.join(tmpdir(), 'spa-'));
  mkdirSync(path.join(staticDir, 'assets'));
  writeFileSync(path.join(staticDir, 'index.html'), '<!doctype html><title>SPA</title>');
  writeFileSync(path.join(staticDir, 'assets', 'app-123.js'), 'console.log("ok")');

  const app = createApp({ ...buildTestConfig(), staticDir });

  afterAll(() => rmSync(staticDir, { recursive: true, force: true }));

  it.each(['/', '/login', '/dashboard'])('devuelve index.html en la ruta de navegación %s', async (route) => {
    const response = await request(app).get(route);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('<title>SPA</title>');
  });

  it('sirve los assets con caché de larga duración', async () => {
    const response = await request(app).get('/assets/app-123.js');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toContain('immutable');
  });

  it('no devuelve index.html para assets inexistentes ni rutas del API', async () => {
    expect((await request(app).get('/assets/no-existe.js')).status).toBe(404);

    const api = await request(app).get('/api/no-existe');
    expect(api.status).toBe(404);
    expect(api.body.error.code).toBe('not_found');
  });

  it('mantiene funcionando el API', async () => {
    const response = await request(app).get('/api/health');
    expect(response.body).toEqual({ status: 'ok' });
  });
});
