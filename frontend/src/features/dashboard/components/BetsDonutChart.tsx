import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card } from '@/components/ui/Card';
import { chartColors } from '../chartTheme';
import { ChartTooltip } from './ChartTooltip';

interface BetsDonutChartProps {
  won: number;
  lost: number;
}

function toPercent(value: number, total: number): string {
  return total === 0 ? '0%' : `${Math.round((value / total) * 100)}%`;
}

export function BetsDonutChart({ won, lost }: BetsDonutChartProps) {
  const total = won + lost;
  const slices = [
    { name: 'Ganadas', value: won, color: chartColors.betsWon },
    { name: 'Perdidas', value: lost, color: chartColors.betsLost },
  ];

  return (
    <Card title="Apuestas ganadas y perdidas" description="Tus apuestas simuladas en la jornada de hoy.">
      <div
        className="relative h-56"
        role="img"
        aria-label={`Gráfica de dona: ${won} apuestas ganadas y ${lost} perdidas de ${total}.`}
      >
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 224 }}>
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius="68%"
              outerRadius="95%"
              startAngle={90}
              endAngle={-270}
              stroke={chartColors.surface}
              strokeWidth={2}
            >
              {slices.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                const entry = payload?.[0];
                if (!entry) return null;
                const value = Number(entry.value);
                return (
                  <ChartTooltip
                    active={active}
                    label={String(entry.name)}
                    value={`${value} de ${total} (${toPercent(value, total)})`}
                    color={(entry.payload as { color: string }).color}
                  />
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold text-stone-900">{total}</span>
          <span className="text-xs text-stone-500">apuestas</span>
        </div>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-3" aria-label="Leyenda">
        {slices.map((slice) => (
          <li key={slice.name} className="rounded-lg bg-stone-50 px-3 py-2">
            <div className="flex items-center gap-2 text-sm text-stone-600">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: slice.color }} aria-hidden="true" />
              {slice.name}
            </div>
            <p className="mt-0.5 text-lg font-semibold text-stone-900">
              {slice.value}{' '}
              <span className="text-sm font-normal text-stone-500">({toPercent(slice.value, total)})</span>
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
