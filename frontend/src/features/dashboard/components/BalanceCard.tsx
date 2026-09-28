import { Plus, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCents } from '@/lib/money';

interface BalanceCardProps {
  balanceCents: number;
  onTopUp: () => void;
}

export function BalanceCard({ balanceCents, onTopUp }: BalanceCardProps) {
  return (
    <section
      aria-labelledby="balance-title"
      className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-brand-900 p-6 text-white shadow-sm"
    >
      <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full border-[28px] border-amber-400/15" />
      <div>
        <h2 id="balance-title" className="flex items-center gap-2 text-sm font-medium text-brand-100">
          <Wallet className="size-4" aria-hidden="true" />
          Saldo disponible
        </h2>
        <p className="mt-3 text-5xl font-semibold tracking-tight" data-testid="balance-amount" aria-live="polite">
          {formatCents(balanceCents)}
        </p>
        <p className="mt-1 text-sm text-brand-200">MXN</p>
      </div>
      <Button
        onClick={onTopUp}
        className="mt-6 self-start bg-amber-400! text-stone-900! hover:bg-amber-300!"
        icon={<Plus className="size-4" aria-hidden="true" />}
      >
        Recargar con SnailPay
      </Button>
    </section>
  );
}
