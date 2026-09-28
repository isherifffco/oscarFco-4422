import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './passwordHasher';

const ITERATIONS = 1_000;

describe('passwordHasher', () => {
  it('no guarda la contraseña en texto plano y la verifica correctamente', async () => {
    const stored = await hashPassword('Caracol123', ITERATIONS);

    expect(JSON.stringify(stored)).not.toContain('Caracol123');
    expect(stored.algorithm).toBe('PBKDF2-SHA256');
    await expect(verifyPassword('Caracol123', stored)).resolves.toBe(true);
    await expect(verifyPassword('caracol123', stored)).resolves.toBe(false);
  });

  it('usa una sal distinta en cada hash', async () => {
    const first = await hashPassword('Caracol123', ITERATIONS);
    const second = await hashPassword('Caracol123', ITERATIONS);

    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
  });

  it('usa 600 000 iteraciones por defecto', async () => {
    const stored = await hashPassword('Caracol123');
    expect(stored.iterations).toBe(600_000);
  });
});
