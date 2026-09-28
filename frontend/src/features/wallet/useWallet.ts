import { useContext } from 'react';
import { WalletContext, type WalletContextValue } from './wallet.context';

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet debe usarse dentro de <WalletProvider>.');
  }
  return context;
}
