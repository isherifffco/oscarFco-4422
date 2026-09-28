import { FlaskConical } from 'lucide-react';
import { TEST_CARD_SCENARIOS } from '../testCards';

export function TestCardsHelp({ onUseApprovedCard }: { onUseApprovedCard: () => void }) {
  return (
    <details className="group rounded-lg border border-dashed border-amber-300 bg-amber-50/60 px-3.5 py-2.5 text-sm">
      <summary className="flex cursor-pointer items-center gap-2 font-medium text-amber-900 select-none">
        <FlaskConical className="size-4" aria-hidden="true" />
        Datos de prueba (entorno simulado)
      </summary>
      <div className="mt-3 space-y-3 text-amber-950">
        <ul className="space-y-1 text-xs">
          {TEST_CARD_SCENARIOS.map((scenario) => (
            <li key={scenario.card} className="flex flex-wrap justify-between gap-x-3">
              <span className="font-mono tabular-nums">{scenario.card}</span>
              <span className="text-amber-900/80">{scenario.result}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-amber-900/80">
          Con la tarjeta aprobada: CVV distinto, otra fecha o un monto mayor a $10,000 producen rechazos específicos.
        </p>
        <button
          type="button"
          onClick={onUseApprovedCard}
          className="rounded-md bg-amber-200/70 px-2.5 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-200"
        >
          Autocompletar tarjeta aprobada
        </button>
      </div>
    </details>
  );
}
