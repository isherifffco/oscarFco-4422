import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { maskCardNumber } from '@/features/snailpay/topUpForm.schema';
import type { TopUpRecord } from '@/features/wallet/wallet.schemas';
import { formatCents } from '@/lib/money';

const OUTCOME_LABELS: Record<TopUpRecord['outcome'], string> = {
  approved: 'Aprobada',
  rejected: 'Rechazada',
  system_error: 'Error de SnailPay',
  invalid_response: 'Respuesta inválida',
  timeout: 'Sin respuesta',
  network_error: 'Sin conexión',
};

const dateFormatter = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

function OutcomeIcon({ outcome }: { outcome: TopUpRecord['outcome'] }) {
  if (outcome === 'approved') return <CheckCircle2 className="size-5 text-green-700" aria-hidden="true" />;
  if (outcome === 'rejected') return <XCircle className="size-5 text-red-600" aria-hidden="true" />;
  return <Clock className="size-5 text-amber-600" aria-hidden="true" />;
}

export function TopUpHistory({ topUps }: { topUps: TopUpRecord[] }) {
  return (
    <Card title="Historial de recargas" description="Intentos registrados en este navegador.">
      {topUps.length === 0 ? (
        <p className="rounded-lg bg-stone-50 px-4 py-6 text-center text-sm text-stone-500">
          Aún no tienes recargas. Tu saldo inicial es de $0.00.
        </p>
      ) : (
        <ul className="max-h-96 divide-y divide-stone-100 overflow-y-auto" aria-label="Recargas recientes">
          {topUps.map((topUp) => (
            <li key={topUp.id} className="flex items-start gap-3 py-3">
              <OutcomeIcon outcome={topUp.outcome} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-stone-900">{OUTCOME_LABELS[topUp.outcome]}</p>
                  <p
                    className={`text-sm font-semibold tabular-nums ${
                      topUp.appliedToBalance ? 'text-green-700' : 'text-stone-400 line-through'
                    }`}
                  >
                    {topUp.appliedToBalance ? '+' : ''}
                    {formatCents(topUp.requestedAmountCents)}
                  </p>
                </div>
                <p className="truncate text-xs text-stone-500">
                  {dateFormatter.format(new Date(topUp.createdAt))}
                  {topUp.response?.card ? ` · ${maskCardNumber(topUp.response.card.number)}` : ''}
                  {topUp.response ? ` · ${topUp.response.status_detail}` : ''}
                </p>
                {topUp.response?.authorization_code ? (
                  <p className="truncate font-mono text-xs text-stone-500">
                    Aut. {topUp.response.authorization_code} · {topUp.response.reference}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
