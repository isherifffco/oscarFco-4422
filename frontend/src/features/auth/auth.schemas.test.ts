import { describe, expect, it } from 'vitest';
import { registerFormSchema } from './auth.schemas';

const VALID = {
  fullName: '  Ana   Pérez López ',
  email: ' Ana@Example.COM ',
  password: 'Caracol123',
  confirmPassword: 'Caracol123',
};

function errorsFor(values: Partial<typeof VALID>) {
  const result = registerFormSchema.safeParse({ ...VALID, ...values });
  return result.success ? {} : Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message]));
}

describe('registerFormSchema', () => {
  it('normaliza nombre y correo', () => {
    const result = registerFormSchema.parse(VALID);
    expect(result.fullName).toBe('Ana Pérez López');
    expect(result.email).toBe('ana@example.com');
  });

  it.each([
    ['nombre sin apellido', { fullName: 'Ana' }, 'fullName'],
    ['nombre con números', { fullName: 'Ana P3rez' }, 'fullName'],
    ['correo inválido', { email: 'ana@' }, 'email'],
    ['contraseña corta', { password: 'Ab1', confirmPassword: 'Ab1' }, 'password'],
    ['contraseña sin mayúscula', { password: 'caracol123', confirmPassword: 'caracol123' }, 'password'],
    ['contraseña sin número', { password: 'Caracoles', confirmPassword: 'Caracoles' }, 'password'],
    ['confirmación distinta', { confirmPassword: 'Caracol124' }, 'confirmPassword'],
  ])('rechaza %s', (_case, values, field) => {
    expect(errorsFor(values)).toHaveProperty(field);
  });
});
