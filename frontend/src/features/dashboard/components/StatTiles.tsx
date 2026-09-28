import { Flag, Target, Ticket, Trophy } from 'lucide-react';
import type { RaceDay } from '@/features/races/raceDaySimulation';

function getLeaders(raceDay: RaceDay): string {
  const maxWins = Math.max(...raceDay.winsBySnail.map((snail) => snail.wins));
  const leaders = raceDay.winsBySnail.filter((snail) => snail.wins === maxWins).map((snail) => snail.name);
  return leaders.length === 1 ? (leaders[0] ?? '') : `Empate: ${leaders.join(', ')}`;
}

export function StatTiles({ raceDay }: { raceDay: RaceDay }) {
  const { betSummary, races } = raceDay;
  const hitRate = betSummary.total === 0 ? 0 : Math.round((betSummary.won / betSummary.total) * 100);

  const tiles = [
    { label: 'Apuestas del día', value: String(betSummary.total), Icon: Ticket },
    { label: 'Tasa de acierto', value: `${hitRate}%`, Icon: Target },
    { label: 'Carreras disputadas', value: `${races.length} de ${races.length}`, Icon: Flag },
    { label: 'Caracol del día', value: getLeaders(raceDay), Icon: Trophy },
  ];

  return (
    <ul className="grid grid-cols-2 gap-4" aria-label="Resumen de la jornada">
      {tiles.map(({ label, value, Icon }) => (
        <li key={label} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
          <p className="flex items-center gap-2 text-sm text-stone-500">
            <Icon className="size-4 text-brand-700" aria-hidden="true" />
            {label}
          </p>
          <p className="mt-2 text-xl font-semibold text-stone-900 sm:text-2xl">{value}</p>
        </li>
      ))}
    </ul>
  );
}
