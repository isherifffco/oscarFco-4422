import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from './auth.context';

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  }
  return context;
}

/** Para componentes que solo se renderizan con sesión activa (dentro de ProtectedRoute). */
export function useAuthenticatedUser() {
  const { user, ...rest } = useAuth();
  if (!user) {
    throw new Error('useAuthenticatedUser requiere una sesión activa.');
  }
  return { user, ...rest };
}
