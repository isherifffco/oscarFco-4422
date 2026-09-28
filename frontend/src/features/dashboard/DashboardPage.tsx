import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuthenticatedUser } from '@/features/auth/useAuth';
import { simulateRaceDay, toLocalDateKey } from '@/features/races/raceDaySimulation';
import { TopUpDialog } from '@/features/snailpay/components/TopUpDialog';
import { useWallet } from '@/features/wallet/useWallet';
import { BalanceCard } from './components/BalanceCard';
import { BetsDonutChart } from './components/BetsDonutChart';
import { DashboardHeader } from './components/DashboardHeader';
import { RaceResultsTable } from './components/RaceResultsTable';
import { RaceWinsChart } from './components/RaceWinsChart';
import { StatTiles } from './components/StatTiles';
import { TopUpHistory } from './components/TopUpHistory';

const longDateFormatter = new Intl.DateTimeFormat('es-MX', { dateStyle: 'full' });

export function DashboardPage() {
  const { user, logout } = useAuthenticatedUser();
  const { wallet } = useWallet();
  const navigate = useNavigate();
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  const today = useMemo(() => new Date(), []);
  const raceDay = useMemo(() => simulateRaceDay(toLocalDateKey(today), user.id), [today, user.id]);
  const firstName = user.fullName.split(' ')[0];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-dvh">
      <DashboardHeader user={user} onLogout={handleLogout} />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Hola, {firstName}</h1>
          <p className="mt-1 text-sm text-stone-500">
            Jornada simulada del {longDateFormatter.format(today)}. Los datos de carreras y apuestas son de demostración.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <BalanceCard balanceCents={wallet.balanceCents} onTopUp={() => setIsTopUpOpen(true)} />
          <div className="lg:col-span-2">
            <StatTiles raceDay={raceDay} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <BetsDonutChart won={raceDay.betSummary.won} lost={raceDay.betSummary.lost} />
          <RaceWinsChart winsBySnail={raceDay.winsBySnail} totalRaces={raceDay.races.length} />
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <RaceResultsTable raceDay={raceDay} />
          </div>
          <div className="lg:col-span-2">
            <TopUpHistory topUps={wallet.topUps} />
          </div>
        </div>
      </main>

      {isTopUpOpen ? <TopUpDialog user={user} onClose={() => setIsTopUpOpen(false)} /> : null}
    </div>
  );
}
