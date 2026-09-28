interface ChartTooltipProps {
  active?: boolean;
  label: string;
  value: string;
  color: string;
}

export function ChartTooltip({ active, label, value, color }: ChartTooltipProps) {
  if (!active) return null;

  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-md">
      <div className="flex items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
        <span className="text-stone-600">{label}</span>
      </div>
      <p className="mt-0.5 text-sm font-semibold text-stone-900">{value}</p>
    </div>
  );
}
