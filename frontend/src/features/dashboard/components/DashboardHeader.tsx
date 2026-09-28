import { LogOut } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import type { PublicUser } from '@/features/auth/auth.schemas';

function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

interface DashboardHeaderProps {
  user: PublicUser;
  onLogout: () => void;
}

export function DashboardHeader({ user, onLogout }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Logo />
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-stone-900" data-testid="user-name">
              {user.fullName}
            </p>
            <p className="text-xs text-stone-500">{user.email}</p>
          </div>
          <span
            className="grid size-9 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800"
            aria-hidden="true"
          >
            {getInitials(user.fullName)}
          </span>
          <Button variant="ghost" onClick={onLogout} icon={<LogOut className="size-4" aria-hidden="true" />}>
            <span className="hidden sm:inline">Cerrar sesión</span>
            <span className="sr-only sm:hidden">Cerrar sesión</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
