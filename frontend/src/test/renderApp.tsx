import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { createAuthService } from '@/features/auth/authService';
import { appRoutes } from '@/routes/routes';

/** Pocas iteraciones de PBKDF2 para que las pruebas sean rápidas. */
export const createTestAuthService = () => createAuthService({ pbkdf2Iterations: 1_000 });

export function renderApp(initialPath = '/', service = createTestAuthService()) {
  const router = createMemoryRouter([{ path: '/', children: appRoutes }], { initialEntries: [initialPath] });
  const user = userEvent.setup();

  const utils = render(
    <AuthProvider service={service}>
      <RouterProvider router={router} />
    </AuthProvider>,
  );

  return { ...utils, router, user, service };
}
