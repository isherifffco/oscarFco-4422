import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { storageKeys } from '@/lib/storage';
import { AuthContext } from './auth.context';
import type { LoginFormValues, PublicUser, RegisterFormValues } from './auth.schemas';
import { authService as defaultAuthService, type AuthService } from './authService';

const SESSION_CHECK_INTERVAL_MS = 60_000;

interface AuthProviderProps {
  children: ReactNode;
  service?: AuthService;
}

export function AuthProvider({ children, service = defaultAuthService }: AuthProviderProps) {
  // La sesión se restaura de forma síncrona para evitar un parpadeo del login al recargar.
  const [user, setUser] = useState<PublicUser | null>(() => service.restoreSession());

  const register = useCallback(
    async (values: RegisterFormValues) => {
      const created = await service.register(values);
      setUser(created);
      return created;
    },
    [service],
  );

  const login = useCallback(
    async (values: LoginFormValues) => {
      const authenticated = await service.login(values);
      setUser(authenticated);
      return authenticated;
    },
    [service],
  );

  const logout = useCallback(() => {
    service.logout();
    setUser(null);
  }, [service]);

  useEffect(() => {
    // Sincroniza la sesión entre pestañas y la cierra cuando expira.
    const syncSession = () => setUser(service.restoreSession());
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === storageKeys.session || event.key === storageKeys.users) {
        syncSession();
      }
    };

    window.addEventListener('storage', onStorage);
    const intervalId = window.setInterval(syncSession, SESSION_CHECK_INTERVAL_MS);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.clearInterval(intervalId);
    };
  }, [service]);

  const value = useMemo(() => ({ user, register, login, logout }), [user, register, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
