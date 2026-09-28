import { Navigate, type RouteObject } from 'react-router';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { GuestRoute } from './GuestRoute';
import { ProtectedRoute } from './ProtectedRoute';

export const appRoutes: RouteObject[] = [
  { index: true, element: <Navigate to="/dashboard" replace /> },
  {
    element: <GuestRoute />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: 'dashboard',
        // Carga diferida: las gráficas solo se descargan cuando hay sesión activa.
        lazy: async () => {
          const { DashboardPage } = await import('@/features/dashboard/DashboardPage');
          return { Component: DashboardPage };
        },
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
];
