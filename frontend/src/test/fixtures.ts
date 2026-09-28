import type { ChargeRequest, ChargeResponse } from '@/features/snailpay/snailPay.types';

export const TEST_USER = {
  id: '6f1c9a52-8a0e-4c1e-9b7a-2f6d1f0b8c11',
  fullName: 'Ana Pérez López',
  email: 'ana@example.com',
  createdAt: '2026-09-28T12:00:00.000Z',
};

export function buildChargeRequest(overrides: Partial<ChargeRequest> = {}): ChargeRequest {
  return {
    card_number: '1234123412341234',
    expiration_date: '12/26',
    cvv: '543',
    holder_name: 'Ana Pérez',
    transaction_amount: 100,
    payer: { id: TEST_USER.id, email: TEST_USER.email },
    ...overrides,
  };
}

export function buildChargeResponse(overrides: Partial<ChargeResponse> = {}): ChargeResponse {
  return {
    id: 'chg_0001',
    status: 'approved',
    status_detail: 'accredited',
    transaction_amount: 100,
    currency_id: 'MXN',
    date_created: '2026-09-28T12:00:00.000Z',
    authorization_code: 'AUTH42',
    reference: 'SNP-20260928-ABC123',
    payer_id: TEST_USER.id,
    payer_email: TEST_USER.email,
    card: { number: '1234123412341234', cvv: '543', expiration_date: '12/26', holder_name: 'Ana Pérez' },
    ...overrides,
  };
}

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
