import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/Card';
import type { SnailWins } from '@/features/races/raceDaySimulation';
import { chartColors } from '../chartTheme';
import { ChartTooltip } from './ChartTooltip';

interface RaceWinsChartProps {
  winsBySnail: SnailWins[];
  totalRaces: number;
}

const pluralizeWins = (wins: number) => `${wins} ${wins === 1 ? 'victoria' : 'victorias'}`;

export function RaceWinsChart({ winsBySnail, totalRaces }: RaceWinsChartProps) {
  const data = [...winsBySnail].sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name));
  const maxWins = Math.max(1, ...data.map((item) => item.wins));
  const summary = data.map((item) => `${item.name}: ${pluralizeWins(item.wins)}`).join(', ');

  return (
    <Card title="Victorias por caracol" description={`${totalRaces} carreras disputadas durante el día simulado.`}>
      <div className="h-72" role="img" aria-label={`Gráfica de barras de victorias. ${summary}.`}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 288 }}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 4 }}>
            <CartesianGrid horizontal={false} stroke={chartColors.grid} />
            <XAxis
              type="number"
              domain={[0, maxWins]}
              allowDecimals={false}
              tickCount={maxWins + 1}
              axisLine={{ stroke: chartColors.axis }}
              tickLine={false}
              tick={{ fill: chartColors.mutedText, fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={128}
              axisLine={{ stroke: chartColors.axis }}
              tickLine={false}
              tick={{ fill: chartColors.mutedText, fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: chartColors.cursor }}
              content={({ active, payload }) => {
                const entry = payload?.[0];
                if (!entry) return null;
                const item = entry.payload as SnailWins;
                return (
                  <ChartTooltip
                    active={active}
                    label={item.name}
                    value={`${pluralizeWins(item.wins)} de ${totalRaces} carreras`}
                    color={chartColors.snailWins}
                  />
                );
              }}
            />
            <Bar dataKey="wins" name="Victorias" fill={chartColors.snailWins} barSize={18} radius={[0, 4, 4, 0]}>
              <LabelList dataKey="wins" position="right" fill={chartColors.mutedText} fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
