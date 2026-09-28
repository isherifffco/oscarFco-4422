import { Navigate, Outlet } from 'react-router';
import { useAuth } from '@/features/auth/useAuth';

/** Login y registro solo están disponibles sin sesión activa. */
export function GuestRoute() {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
