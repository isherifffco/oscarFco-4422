import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, description, action, children, className = '' }: CardProps) {
  return (
    <section className={`rounded-2xl border border-stone-200 bg-white p-5 shadow-xs ${className}`}>
      {title ? (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-stone-900">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-stone-500">{description}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}
