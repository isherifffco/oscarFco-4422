import { createContext } from 'react';
import type { RecordableChargeAttempt } from '@/features/snailpay/snailPay.types';
import type { Wallet } from './wallet.schemas';

export interface WalletContextValue {
  wallet: Wallet;
  recordAttempt: (requestedAmountCents: number, result: RecordableChargeAttempt) => Wallet;
}

export const WalletContext = createContext<WalletContextValue | null>(null);
