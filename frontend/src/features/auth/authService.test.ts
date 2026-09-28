import { describe, expect, it } from 'vitest';
import { storageKeys } from '@/lib/storage';
import { AuthError, createAuthService, LOGIN_LOCK_MS, MAX_FAILED_LOGIN_ATTEMPTS } from './authService';

const REGISTER_VALUES = {
  fullName: 'Ana Pérez López',
  email: 'ana@example.com',
  password: 'Caracol123',
  confirmPassword: 'Caracol123',
};

function createService(now = () => Date.parse('2026-09-28T12:00:00.000Z')) {
  return createAuthService({ pbkdf2Iterations: 1_000, sessionDurationMs: 60_000, now });
}

describe('authService', () => {
  it('registra al usuario, guarda solo el hash de la contraseña e inicia sesión', async () => {
    const service = createService();

    const user = await service.register(REGISTER_VALUES);

    const rawUsers = localStorage.getItem(storageKeys.users) ?? '';
    expect(rawUsers).not.toContain('Caracol123');
    expect(rawUsers).toContain('PBKDF2-SHA256');
    expect(user).toEqual(expect.objectContaining({ fullName: 'Ana Pérez López', email: 'ana@example.com' }));
    expect(user).not.toHaveProperty('password');
    expect(service.restoreSession()?.id).toBe(user.id);
  });

  it('no permite registrar dos veces el mismo correo', async () => {
    const service = createService();
    await service.register(REGISTER_VALUES);

    await expect(service.register(REGISTER_VALUES)).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
  });

  it('permite cerrar sesión e iniciarla de nuevo con correo y contraseña', async () => {
    const service = createService();
    const registered = await service.register(REGISTER_VALUES);

    service.logout();
    expect(service.restoreSession()).toBeNull();

    const loggedIn = await service.login({ email: 'ana@example.com', password: 'Caracol123' });
    expect(loggedIn.id).toBe(registered.id);
    expect(service.restoreSession()?.id).toBe(registered.id);
  });

  it('responde con un error genérico ante credenciales inválidas o correos inexistentes', async () => {
    const service = createService();
    await service.register(REGISTER_VALUES);
    service.logout();

    await expect(service.login({ email: 'ana@example.com', password: 'Otra1234' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: 'Correo o contraseña incorrectos.',
    });
    await expect(service.login({ email: 'nadie@example.com', password: 'Caracol123' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: 'Correo o contraseña incorrectos.',
    });
    expect(service.restoreSession()).toBeNull();
  });

  it(`bloquea el inicio de sesión tras ${MAX_FAILED_LOGIN_ATTEMPTS} intentos fallidos`, async () => {
    let now = Date.parse('2026-09-28T12:00:00.000Z');
    const service = createService(() => now);
    await service.register(REGISTER_VALUES);
    service.logout();

    for (let attempt = 0; attempt < MAX_FAILED_LOGIN_ATTEMPTS; attempt += 1) {
      await expect(service.login({ email: 'ana@example.com', password: 'Mala1234' })).rejects.toBeInstanceOf(AuthError);
    }

    await expect(service.login({ email: 'ana@example.com', password: 'Caracol123' })).rejects.toMatchObject({
      code: 'TOO_MANY_ATTEMPTS',
    });

    now += LOGIN_LOCK_MS;
    await expect(service.login({ email: 'ana@example.com', password: 'Caracol123' })).resolves.toBeTruthy();
  });

  it('invalida la sesión cuando expira', async () => {
    let now = Date.parse('2026-09-28T12:00:00.000Z');
    const service = createService(() => now);
    await service.register(REGISTER_VALUES);

    now += 60_000;

    expect(service.restoreSession()).toBeNull();
    expect(localStorage.getItem(storageKeys.session)).toBeNull();
  });

  it('ignora datos de sesión corruptos o manipulados', () => {
    const service = createService();
    localStorage.setItem(storageKeys.session, '{"userId": 1, "token": "x"');

    expect(service.restoreSession()).toBeNull();
  });
});
