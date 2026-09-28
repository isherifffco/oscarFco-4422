import { zodResolver } from '@hookform/resolvers/zod';
import { CreditCard, Lock } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/TextField';
import type { PublicUser } from '@/features/auth/auth.schemas';
import { formatAmount } from '@/lib/money';
import { describeChargeAttempt } from '../chargeMessages';
import {
  formatCardNumberInput,
  formatExpirationInput,
  topUpFormSchema,
  type TopUpFormInput,
  type TopUpFormValues,
} from '../topUpForm.schema';
import { useTopUp } from '../useTopUp';
import { APPROVED_TEST_CARD } from '../testCards';
import { TestCardsHelp } from './TestCardsHelp';

const QUICK_AMOUNTS = [100, 250, 500, 1000] as const;

interface TopUpDialogProps {
  user: PublicUser;
  onClose: () => void;
}

export function TopUpDialog({ user, onClose }: TopUpDialogProps) {
  const { state, submit, reset } = useTopUp(user);
  const isSubmitting = state.status === 'submitting';

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<TopUpFormInput, unknown, TopUpFormValues>({
    resolver: zodResolver(topUpFormSchema),
    defaultValues: { amount: '', holderName: user.fullName, cardNumber: '', expirationDate: '', cvv: '' },
  });

  const amountInput = useWatch({ control, name: 'amount' });
  const parsedAmount = Number(amountInput);
  const amountLabel = amountInput && parsedAmount > 0 ? formatAmount(parsedAmount) : '';

  const onSubmit = handleSubmit((values) => submit(values));

  const fillApprovedCard = () => {
    setValue('cardNumber', APPROVED_TEST_CARD.cardNumber, { shouldValidate: true });
    setValue('expirationDate', APPROVED_TEST_CARD.expirationDate, { shouldValidate: true });
    setValue('cvv', APPROVED_TEST_CARD.cvv, { shouldValidate: true });
  };

  const completed = state.status === 'completed' ? state : null;
  const message = completed ? describeChargeAttempt(completed.result) : null;
  const isApproved = completed?.result.kind === 'approved';

  return (
    <Modal
      isOpen
      title="Recargar saldo"
      description="Pago procesado por SnailPay (pasarela simulada)."
      onClose={onClose}
      preventClose={isSubmitting}
    >
      {isApproved && message ? (
        <div className="space-y-5">
          <Alert tone="success" title={message.title}>
            <p>{message.description}</p>
            {message.details?.map((detail) => (
              <p key={detail} className="font-mono text-xs">
                {detail}
              </p>
            ))}
          </Alert>
          {completed?.storageError ? (
            <Alert tone="warning" title="No pudimos guardar el saldo en este navegador">
              <p>Conserva la referencia de la operación y libera espacio de almacenamiento.</p>
            </Alert>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={reset}>
              Hacer otra recarga
            </Button>
            <Button onClick={onClose}>Listo</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <TestCardsHelp onUseApprovedCard={fillApprovedCard} />

          <fieldset disabled={isSubmitting} className="space-y-4">
            <div>
              <TextField
                label="Monto a recargar (MXN)"
                inputMode="decimal"
                placeholder="0.00"
                autoComplete="off"
                error={errors.amount?.message}
                {...register('amount')}
              />
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Montos sugeridos">
                {QUICK_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setValue('amount', String(amount), { shouldValidate: true })}
                    className="rounded-full border border-stone-300 px-3 py-1 text-xs font-medium text-stone-700 hover:border-brand-600 hover:text-brand-800"
                  >
                    {formatAmount(amount)}
                  </button>
                ))}
              </div>
            </div>

            <TextField
              label="Nombre del titular"
              autoComplete="cc-name"
              error={errors.holderName?.message}
              {...register('holderName')}
            />

            <TextField
              label="Número de tarjeta"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 1234 1234 1234"
              error={errors.cardNumber?.message}
              {...register('cardNumber', {
                onChange: (event) => setValue('cardNumber', formatCardNumberInput(event.target.value)),
              })}
            />

            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Vencimiento"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/AA"
                error={errors.expirationDate?.message}
                {...register('expirationDate', {
                  onChange: (event) => setValue('expirationDate', formatExpirationInput(event.target.value)),
                })}
              />
              <TextField
                label="CVV"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="123"
                maxLength={3}
                error={errors.cvv?.message}
                {...register('cvv', {
                  onChange: (event) => setValue('cvv', event.target.value.replace(/\D/g, '').slice(0, 3)),
                })}
              />
            </div>
          </fieldset>

          {message ? (
            <Alert tone={message.tone} title={message.title}>
              <p>{message.description}</p>
              {message.details && message.details.length > 0 ? (
                <ul className="list-disc pl-4 text-xs">
                  {message.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              ) : null}
            </Alert>
          ) : null}

          {isSubmitting ? (
            <p className="text-center text-xs text-stone-500" role="status">
              Procesando el pago con SnailPay. Esto puede tardar unos segundos...
            </p>
          ) : null}

          <Button
            type="submit"
            className="w-full"
            isLoading={isSubmitting}
            loadingText="Procesando pago..."
            icon={<CreditCard className="size-4" aria-hidden="true" />}
          >
            {amountLabel ? `Pagar ${amountLabel}` : 'Pagar'}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-stone-500">
            <Lock className="size-3" aria-hidden="true" />
            Usa solo datos ficticios. SnailPay no procesa pagos reales.
          </p>
        </form>
      )}
    </Modal>
  );
}
