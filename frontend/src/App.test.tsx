import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { storageKeys } from '@/lib/storage';
import { buildChargeResponse, jsonResponse } from '@/test/fixtures';
import { createTestAuthService, renderApp } from '@/test/renderApp';

const REGISTER_VALUES = {
  fullName: 'Ana Pérez López',
  email: 'ana@example.com',
  password: 'Caracol123',
  confirmPassword: 'Caracol123',
};

/** El dashboard se carga de forma diferida, así que se espera a que aparezca. */
async function renderLoggedIn() {
  const service = createTestAuthService();
  await service.register(REGISTER_VALUES);
  const utils = renderApp('/dashboard', service);
  await screen.findByTestId('balance-amount', {}, { timeout: 5_000 });
  return utils;
}

/** Simula a SnailPay respondiendo de forma coherente con lo solicitado. */
function mockSnailPay(status: number, overrides: Parameters<typeof buildChargeResponse>[0] = {}) {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    return jsonResponse(
      status,
      buildChargeResponse({
        transaction_amount: body.transaction_amount,
        payer_id: body.payer.id,
        payer_email: body.payer.email,
        ...overrides,
      }),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function submitTopUp(user: ReturnType<typeof renderApp>['user'], cvv = '543') {
  await user.click(screen.getByRole('button', { name: /recargar con snailpay/i }));
  const dialog = await screen.findByRole('dialog', { name: 'Recargar saldo' });
  await user.type(within(dialog).getByLabelText('Monto a recargar (MXN)'), '100');
  await user.type(within(dialog).getByLabelText('Número de tarjeta'), '1234123412341234');
  await user.type(within(dialog).getByLabelText('Vencimiento'), '1226');
  await user.type(within(dialog).getByLabelText('CVV'), cvv);
  await user.click(within(dialog).getByRole('button', { name: /pagar/i }));
  return dialog;
}

describe('flujo de la aplicación', () => {
  it('redirige al login cuando no existe una sesión activa', async () => {
    const { router } = renderApp('/dashboard');

    expect(await screen.findByRole('heading', { name: 'Inicia sesión' }, { timeout: 5_000 })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('registra un usuario y muestra el dashboard con saldo inicial de $0', async () => {
    const { user } = renderApp('/register');

    await user.type(screen.getByLabelText('Nombre completo'), REGISTER_VALUES.fullName);
    await user.type(screen.getByLabelText('Correo electrónico'), REGISTER_VALUES.email);
    await user.type(screen.getByLabelText('Contraseña'), REGISTER_VALUES.password);
    await user.type(screen.getByLabelText('Confirmar contraseña'), REGISTER_VALUES.confirmPassword);
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByRole('heading', { name: 'Hola, Ana' }, { timeout: 5_000 })).toBeInTheDocument();
    expect(screen.getByTestId('user-name')).toHaveTextContent('Ana Pérez López');
    expect(screen.getByTestId('balance-amount')).toHaveTextContent('$0.00');
    expect(screen.getByRole('heading', { name: 'Apuestas ganadas y perdidas' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Victorias por caracol' })).toBeInTheDocument();
  });

  it('muestra errores de validación sin enviar el formulario de registro', async () => {
    const { user, router } = renderApp('/register');

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Ingresa tu nombre completo')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/register');
    expect(localStorage.getItem(storageKeys.users)).toBeNull();
  });

  it('abona el saldo de inmediato y lo conserva al recargar la página cuando el cobro es aprobado', async () => {
    const fetchMock = mockSnailPay(201);
    const { user, unmount, service } = await renderLoggedIn();

    const dialog = await submitTopUp(user);

    expect(await within(dialog).findByText('¡Recarga aprobada!')).toBeInTheDocument();
    expect(screen.getByTestId('balance-amount')).toHaveTextContent('$100.00');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    unmount();
    renderApp('/dashboard', service);
    expect(await screen.findByTestId('balance-amount', {}, { timeout: 5_000 })).toHaveTextContent('$100.00');
  });

  it('no modifica el saldo cuando SnailPay rechaza el cobro', async () => {
    mockSnailPay(402, {
      status: 'rejected',
      status_detail: 'cc_rejected_bad_filled_security_code',
      authorization_code: null,
    });
    const { user } = await renderLoggedIn();

    const dialog = await submitTopUp(user, '111');

    expect(await within(dialog).findByText('La recarga fue rechazada')).toBeInTheDocument();
    expect(within(dialog).getByText(/El CVV no es correcto/)).toBeInTheDocument();
    expect(screen.getByTestId('balance-amount')).toHaveTextContent('$0.00');
  });

  it('informa un error del sistema sin aplicar la recarga', async () => {
    mockSnailPay(503, { status: 'error', status_detail: 'service_unavailable', authorization_code: null });
    const { user } = await renderLoggedIn();

    const dialog = await submitTopUp(user);

    expect(await within(dialog).findByText('SnailPay no pudo procesar la recarga')).toBeInTheDocument();
    expect(screen.getByTestId('balance-amount')).toHaveTextContent('$0.00');
  });

  it('cierra la sesión y protege el dashboard', async () => {
    const { user, router } = await renderLoggedIn();

    await user.click(await screen.findByRole('button', { name: /cerrar sesión/i }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(localStorage.getItem(storageKeys.session)).toBeNull();

    await router.navigate('/dashboard');
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });
});
