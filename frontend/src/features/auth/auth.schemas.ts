import { z } from 'zod';
import { passwordHashSchema } from '@/lib/passwordHasher';

// ---------- Formularios ----------

const FULL_NAME_PATTERN = /^[\p{L}\p{M}' .-]+$/u;

export const PASSWORD_RULES = [
  { id: 'length', label: 'Al menos 8 caracteres', test: (value: string) => value.length >= 8 },
  { id: 'lower', label: 'Una letra minúscula', test: (value: string) => /[a-z]/.test(value) },
  { id: 'upper', label: 'Una letra mayúscula', test: (value: string) => /[A-Z]/.test(value) },
  { id: 'number', label: 'Un número', test: (value: string) => /\d/.test(value) },
] as const;

const emailField = z
  .string()
  .trim()
  .min(1, 'Ingresa tu correo electrónico')
  .max(254, 'El correo es demasiado largo')
  .pipe(z.email('Ingresa un correo electrónico válido'))
  .transform((value) => value.toLowerCase());

export const registerFormSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, 'Ingresa tu nombre completo')
      .max(80, 'El nombre debe tener como máximo 80 caracteres')
      .regex(FULL_NAME_PATTERN, 'El nombre solo puede contener letras, espacios, apóstrofes y guiones')
      .refine((value) => value.split(/\s+/).filter(Boolean).length >= 2, 'Ingresa tu nombre y al menos un apellido')
      .transform((value) => value.replace(/\s+/g, ' ')),
    email: emailField,
    password: z
      .string()
      .max(128, 'La contraseña debe tener como máximo 128 caracteres')
      .superRefine((value, ctx) => {
        const failed = PASSWORD_RULES.filter((rule) => !rule.test(value));
        if (failed.length > 0) {
          ctx.addIssue({
            code: 'custom',
            message: `La contraseña necesita: ${failed.map((rule) => rule.label.toLowerCase()).join(', ')}`,
          });
        }
      }),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  });

export type RegisterFormInput = z.input<typeof registerFormSchema>;
export type RegisterFormValues = z.output<typeof registerFormSchema>;

export const loginFormSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Ingresa tu contraseña').max(128),
});

export type LoginFormInput = z.input<typeof loginFormSchema>;
export type LoginFormValues = z.output<typeof loginFormSchema>;

// ---------- Persistencia ----------

export const storedUserSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().min(1),
  email: z.string().min(1),
  password: passwordHashSchema,
  createdAt: z.iso.datetime(),
});

export type StoredUser = z.infer<typeof storedUserSchema>;

/** Usuarios indexados por correo normalizado. */
export const usersMapSchema = z.record(z.string(), storedUserSchema);

export const sessionSchema = z.object({
  userId: z.string().min(1),
  token: z.string().length(64),
  issuedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
});

export type Session = z.infer<typeof sessionSchema>;

export const loginThrottleSchema = z.record(
  z.string(),
  z.object({
    failedAttempts: z.number().int().nonnegative(),
    lockedUntil: z.number().int().nullable(),
  }),
);

/** Datos del usuario que se exponen a la interfaz: nunca incluye el hash de la contraseña. */
export interface PublicUser {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
}
