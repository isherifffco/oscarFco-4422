import type { AppConfig } from '../src/config/env.js';
import type { ChargeRequest } from '../src/modules/snailpay/snailpay.types.js';

export function buildTestConfig(overrides: Partial<AppConfig['snailPay']> = {}, rateLimitPerMinute = 1_000): AppConfig {
  return {
    nodeEnv: 'test',
    port: 0,
    corsOrigins: ['http://localhost:5173'],
    snailPay: {
      simulateOutage: false,
      slowResponseMs: 0,
      ...overrides,
    },
    rateLimitPerMinute,
    staticDir: null,
    trustProxy: 0,
  };
}

export function buildChargeRequest(overrides: Partial<ChargeRequest> = {}): ChargeRequest {
  return {
    card_number: '1234123412341234',
    expiration_date: '12/26',
    cvv: '543',
    holder_name: 'Ana Pérez',
    transaction_amount: 250.5,
    payer: {
      id: '6f1c9a52-8a0e-4c1e-9b7a-2f6d1f0b8c11',
      email: 'ana@example.com',
    },
    ...overrides,
  };
}
