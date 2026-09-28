import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';

type AlertTone = 'success' | 'error' | 'warning' | 'info';

const TONES: Record<AlertTone, { classes: string; Icon: typeof Info }> = {
  success: { classes: 'border-green-200 bg-green-50 text-green-900', Icon: CheckCircle2 },
  error: { classes: 'border-red-200 bg-red-50 text-red-900', Icon: XCircle },
  warning: { classes: 'border-amber-200 bg-amber-50 text-amber-900', Icon: AlertTriangle },
  info: { classes: 'border-sky-200 bg-sky-50 text-sky-900', Icon: Info },
};

interface AlertProps {
  tone: AlertTone;
  title: string;
  children?: ReactNode;
}

export function Alert({ tone, title, children }: AlertProps) {
  const { classes, Icon } = TONES[tone];
  // Los errores interrumpen al lector de pantalla; el resto se anuncia de forma cortés.
  const role = tone === 'error' ? 'alert' : 'status';

  return (
    <div role={role} className={`flex gap-3 rounded-lg border p-3.5 text-sm ${classes}`}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        {children ? <div className="mt-1 space-y-1">{children}</div> : null}
      </div>
    </div>
  );
}
