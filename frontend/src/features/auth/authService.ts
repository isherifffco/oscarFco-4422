import { appConfig } from '@/config';
import { createId, createToken } from '@/lib/ids';
import { DEFAULT_PBKDF2_ITERATIONS, hashPassword, verifyPassword } from '@/lib/passwordHasher';
import { readJson, removeItem, storageKeys, writeJson } from '@/lib/storage';
import {
  loginThrottleSchema,
  sessionSchema,
  usersMapSchema,
  type LoginFormValues,
  type PublicUser,
  type RegisterFormValues,
  type Session,
  type StoredUser,
} from './auth.schemas';

export type AuthErrorCode = 'EMAIL_TAKEN' | 'INVALID_CREDENTIALS' | 'TOO_MANY_ATTEMPTS';

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly retryAfterMs?: number;

  constructor(code: AuthErrorCode, message: string, retryAfterMs?: number) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }
}

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCK_MS = 60_000;

export interface AuthServiceOptions {
  pbkdf2Iterations?: number;
  sessionDurationMs?: number;
  now?: () => number;
}

function toPublicUser(user: StoredUser): PublicUser {
  return { id: user.id, fullName: user.fullName, email: user.email, createdAt: user.createdAt };
}

export function createAuthService(options: AuthServiceOptions = {}) {
  const iterations = options.pbkdf2Iterations ?? DEFAULT_PBKDF2_ITERATIONS;
  const sessionDurationMs = options.sessionDurationMs ?? appConfig.sessionDurationMs;
  const now = options.now ?? Date.now;

  const readUsers = () => readJson(storageKeys.users, usersMapSchema) ?? {};
  const readThrottle = () => readJson(storageKeys.loginThrottle, loginThrottleSchema) ?? {};

  function startSession(userId: string): Session {
    const issuedAt = now();
    const session: Session = {
      userId,
      token: createToken(),
      issuedAt: new Date(issuedAt).toISOString(),
      expiresAt: new Date(issuedAt + sessionDurationMs).toISOString(),
    };
    writeJson(storageKeys.session, session);
    return session;
  }

  function assertNotLocked(email: string): void {
    const entry = readThrottle()[email];
    if (entry?.lockedUntil && entry.lockedUntil > now()) {
      const retryAfterMs = entry.lockedUntil - now();
      throw new AuthError(
        'TOO_MANY_ATTEMPTS',
        `Demasiados intentos fallidos. Intenta de nuevo en ${Math.ceil(retryAfterMs / 1000)} segundos.`,
        retryAfterMs,
      );
    }
  }

  function registerFailedAttempt(email: string): void {
    const throttle = readThrottle();
    const previous = throttle[email];
    const lockExpired = previous?.lockedUntil != null && previous.lockedUntil <= now();
    const failedAttempts = (lockExpired ? 0 : (previous?.failedAttempts ?? 0)) + 1;

    throttle[email] = {
      failedAttempts,
      lockedUntil: failedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS ? now() + LOGIN_LOCK_MS : null,
    };
    writeJson(storageKeys.loginThrottle, throttle);
  }

  function clearFailedAttempts(email: string): void {
    const throttle = readThrottle();
    if (!(email in throttle)) return;
    delete throttle[email];
    writeJson(storageKeys.loginThrottle, throttle);
  }

  return {
    async register(values: RegisterFormValues): Promise<PublicUser> {
      const users = readUsers();
      if (users[values.email]) {
        throw new AuthError('EMAIL_TAKEN', 'Ya existe una cuenta con este correo. Inicia sesión.');
      }

      const user: StoredUser = {
        id: createId(),
        fullName: values.fullName,
        email: values.email,
        password: await hashPassword(values.password, iterations),
        createdAt: new Date(now()).toISOString(),
      };

      writeJson(storageKeys.users, { ...users, [user.email]: user });
      startSession(user.id);
      return toPublicUser(user);
    },

    async login(values: LoginFormValues): Promise<PublicUser> {
      assertNotLocked(values.email);

      const user = readUsers()[values.email];
      // Se calcula un hash aunque el usuario no exista para no revelar,
      // por el tiempo de respuesta, qué correos están registrados.
      const isValid = user
        ? await verifyPassword(values.password, user.password)
        : await hashPassword(values.password, iterations).then(() => false);

      if (!user || !isValid) {
        registerFailedAttempt(values.email);
        throw new AuthError('INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');
      }

      clearFailedAttempts(values.email);
      startSession(user.id);
      return toPublicUser(user);
    },

    logout(): void {
      removeItem(storageKeys.session);
    },

    /** Recupera la sesión activa; devuelve null si no existe, expiró o el usuario ya no existe. */
    restoreSession(): PublicUser | null {
      const session = readJson(storageKeys.session, sessionSchema);
      if (!session) return null;

      if (Date.parse(session.expiresAt) <= now()) {
        removeItem(storageKeys.session);
        return null;
      }

      const user = Object.values(readUsers()).find((candidate) => candidate.id === session.userId);
      if (!user) {
        removeItem(storageKeys.session);
        return null;
      }

      return toPublicUser(user);
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;

export const authService = createAuthService();
