import { LogOut } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogout, useMe } from '../features/auth/auth';
import { Wordmark } from './Wordmark';
import { SiteFooter } from '../components/SiteFooter';

export function AppShell({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-surface px-3 py-2 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <header className="bg-[rgb(31_61_54)] text-[rgb(251_252_250)]">
        <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-6 px-4 sm:px-6">
          <Wordmark light />
          <nav aria-label="Main" className="hidden sm:block">
            <span aria-current="page" className="rounded-control bg-white/10 px-3 py-1.5 text-sm font-medium">
              Students
            </span>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-white/70 md:inline">{me?.name}</span>
            <button
              type="button"
              onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/login') })}
              className="inline-flex h-9 items-center gap-2 rounded-control px-3 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white"
            >
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-[1240px] flex-1 px-4 pb-16 pt-8 sm:px-6">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
