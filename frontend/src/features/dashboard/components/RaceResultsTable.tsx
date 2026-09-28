import { Card } from '@/components/ui/Card';
import { getSnailName, type RaceDay } from '@/features/races/raceDaySimulation';

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes} min ${String(seconds).padStart(2, '0')} s`;
}

export function RaceResultsTable({ raceDay }: { raceDay: RaceDay }) {
  return (
    <Card title="Resultados de la jornada" description="Ganador de cada carrera y tus apuestas simuladas.">
      <div className="-mx-5 overflow-x-auto px-5">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-xs text-stone-500 uppercase">
              <th scope="col" className="py-2 pr-3 font-medium">
                Carrera
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Ganador
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Tiempo
              </th>
              <th scope="col" className="py-2 font-medium">
                Tus apuestas
              </th>
            </tr>
          </thead>
          <tbody>
            {raceDay.races.map((race) => {
              const winner = race.finishOrder[0];
              const bets = raceDay.bets.filter((bet) => bet.raceNumber === race.number);
              return (
                <tr key={race.number} className="border-b border-stone-100 last:border-0">
                  <td className="py-2.5 pr-3 whitespace-nowrap text-stone-600">
                    #{race.number} · {race.startTime}
                  </td>
                  <td className="py-2.5 pr-3 font-medium text-stone-900">{getSnailName(race.winnerId)}</td>
                  <td className="py-2.5 pr-3 whitespace-nowrap text-stone-600 tabular-nums">
                    {winner ? formatDuration(winner.timeSeconds) : '—'}
                  </td>
                  <td className="py-2.5">
                    <ul className="flex flex-wrap gap-1.5">
                      {bets.map((bet) => (
                        <li
                          key={bet.snailId}
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            bet.won ? 'bg-sky-50 text-sky-800' : 'bg-orange-50 text-orange-800'
                          }`}
                        >
                          {bet.won ? '✓' : '✗'} {getSnailName(bet.snailId)}
                          <span className="sr-only">{bet.won ? ' (ganada)' : ' (perdida)'}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
