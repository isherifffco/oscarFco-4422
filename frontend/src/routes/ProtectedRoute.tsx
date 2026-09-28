import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '@/features/auth/useAuth';
import { WalletProvider } from '@/features/wallet/WalletProvider';

/** Solo permite el acceso con una sesión activa; si no, redirige al login. */
export function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <WalletProvider key={user.id} userId={user.id}>
      <Outlet />
    </WalletProvider>
  );
}
