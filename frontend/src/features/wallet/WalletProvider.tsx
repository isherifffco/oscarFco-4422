import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { RecordableChargeAttempt } from '@/features/snailpay/snailPay.types';
import { storageKeys } from '@/lib/storage';
import { WalletContext } from './wallet.context';
import type { Wallet } from './wallet.schemas';
import { getWallet, recordChargeAttempt } from './walletService';

/** Se monta con `key={userId}` para reiniciar el estado cuando cambia el usuario. */
export function WalletProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [wallet, setWallet] = useState<Wallet>(() => getWallet(userId));

  const recordAttempt = useCallback(
    (requestedAmountCents: number, result: RecordableChargeAttempt) => {
      const updated = recordChargeAttempt(userId, requestedAmountCents, result);
      setWallet(updated);
      return updated;
    },
    [userId],
  );

  useEffect(() => {
    // Mantiene el saldo sincronizado si se recarga desde otra pestaña.
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === storageKeys.wallet(userId)) {
        setWallet(getWallet(userId));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [userId]);

  const value = useMemo(() => ({ wallet, recordAttempt }), [wallet, recordAttempt]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
