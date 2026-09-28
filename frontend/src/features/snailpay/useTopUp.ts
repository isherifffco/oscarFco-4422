import { useCallback, useEffect, useRef, useState } from 'react';
import type { PublicUser } from '@/features/auth/auth.schemas';
import { useWallet } from '@/features/wallet/useWallet';
import { createIdempotencyKey } from '@/lib/ids';
import { toCents } from '@/lib/money';
import { StorageUnavailableError } from '@/lib/storage';
import { createCharge as defaultCreateCharge } from './snailPayClient';
import type { ChargeRequest, RecordableChargeAttempt } from './snailPay.types';
import type { TopUpFormValues } from './topUpForm.schema';

export type TopUpState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'completed'; result: RecordableChargeAttempt; storageError: boolean };

export function toChargeRequest(values: TopUpFormValues, user: PublicUser): ChargeRequest {
  return {
    card_number: values.cardNumber,
    expiration_date: values.expirationDate,
    cvv: values.cvv,
    holder_name: values.holderName,
    transaction_amount: values.amount,
    payer: { id: user.id, email: user.email },
  };
}

/**
 * Orquesta una recarga: arma la solicitud, llama a SnailPay y registra el resultado.
 * La llave de idempotencia se conserva al reintentar la misma solicitud tras un timeout
 * o error de red, así el servidor no puede cobrarla dos veces.
 */
export function useTopUp(user: PublicUser, createCharge = defaultCreateCharge) {
  const { recordAttempt } = useWallet();
  const [state, setState] = useState<TopUpState>({ status: 'idle' });
  const pendingKey = useRef<{ fingerprint: string; key: string } | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => () => inFlight.current?.abort(), []);

  const submit = useCallback(
    async (values: TopUpFormValues) => {
      if (inFlight.current) return; // Evita envíos dobles.

      const request = toChargeRequest(values, user);
      const fingerprint = JSON.stringify(request);
      if (pendingKey.current?.fingerprint !== fingerprint) {
        pendingKey.current = { fingerprint, key: createIdempotencyKey() };
      }

      const controller = new AbortController();
      inFlight.current = controller;
      setState({ status: 'submitting' });

      const result = await createCharge(request, {
        idempotencyKey: pendingKey.current.key,
        signal: controller.signal,
      });
      inFlight.current = null;

      if (result.kind === 'cancelled') return;

      // Un resultado definitivo cierra la operación: la siguiente recarga usará una llave nueva.
      if (result.kind === 'approved' || result.kind === 'rejected') {
        pendingKey.current = null;
      }

      let storageError = false;
      try {
        recordAttempt(toCents(values.amount), result);
      } catch (error) {
        if (!(error instanceof StorageUnavailableError)) throw error;
        storageError = true;
      }

      setState({ status: 'completed', result, storageError });
    },
    [createCharge, recordAttempt, user],
  );

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, submit, reset };
}
