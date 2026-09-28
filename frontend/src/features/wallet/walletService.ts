import type { RecordableChargeAttempt } from '@/features/snailpay/snailPay.types';
import { createId } from '@/lib/ids';
import { toCents } from '@/lib/money';
import { readJson, storageKeys, writeJson } from '@/lib/storage';
import { walletSchema, type TopUpRecord, type Wallet } from './wallet.schemas';

/** Cantidad máxima de intentos que se conservan en el historial. */
export const MAX_TOP_UP_HISTORY = 50;

const EMPTY_WALLET: Wallet = { balanceCents: 0, topUps: [] };

export function getWallet(userId: string): Wallet {
  return readJson(storageKeys.wallet(userId), walletSchema) ?? EMPTY_WALLET;
}

/**
 * Registra un intento de recarga y, solo si fue aprobado, suma el monto al saldo.
 * Saldo e historial se guardan en una sola escritura para que no queden desincronizados.
 * Una misma operación aprobada (mismo id) nunca se abona dos veces.
 */
export function recordChargeAttempt(
  userId: string,
  requestedAmountCents: number,
  result: RecordableChargeAttempt,
  now: () => Date = () => new Date(),
): Wallet {
  const wallet = getWallet(userId);
  const response = 'charge' in result ? result.charge : null;

  const alreadyApplied =
    result.kind === 'approved' &&
    wallet.topUps.some((topUp) => topUp.appliedToBalance && topUp.response?.id === result.charge.id);

  const shouldApply = result.kind === 'approved' && !alreadyApplied;
  const creditedCents = shouldApply ? toCents(result.charge.transaction_amount ?? 0) : 0;

  const record: TopUpRecord = {
    id: response?.id ?? createId(),
    createdAt: response?.date_created ?? now().toISOString(),
    requestedAmountCents,
    outcome: result.kind,
    appliedToBalance: shouldApply,
    response,
  };

  const updated: Wallet = {
    balanceCents: wallet.balanceCents + creditedCents,
    topUps: [record, ...wallet.topUps].slice(0, MAX_TOP_UP_HISTORY),
  };

  writeJson(storageKeys.wallet(userId), updated);
  return updated;
}
