import type { ReactNode } from 'react';
import { Logo } from '@/components/Logo';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-brand-900 p-12 text-brand-50 lg:flex lg:flex-col lg:justify-between">
        <Logo className="text-white [&_span_span]:text-amber-300" />
        <div className="max-w-md">
          <p className="text-4xl leading-tight font-bold">Seis caracoles. Seis carreras. Un solo campeón del día.</p>
          <p className="mt-4 text-brand-200">
            Consulta tus estadísticas de apuestas, revisa quién domina la pista y recarga saldo en segundos con
            SnailPay.
          </p>
        </div>
        <p className="text-xs text-brand-300">Datos simulados con fines demostrativos. No se procesan pagos reales.</p>
        <div className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full border-[40px] border-amber-400/10" />
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Logo className="mb-8 text-xl lg:hidden" />
          <h1 className="text-2xl font-bold text-stone-900">{title}</h1>
          <p className="mt-1 text-sm text-stone-600">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 text-center text-sm text-stone-600">{footer}</div>
        </div>
      </main>
    </div>
  );
}
