import { createBrowserRouter, RouterProvider } from 'react-router';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { appRoutes } from '@/routes/routes';

const router = createBrowserRouter([{ path: '/', children: appRoutes }]);

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
