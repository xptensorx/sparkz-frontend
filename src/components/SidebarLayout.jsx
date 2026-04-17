import { useEffect, useState } from 'react';
import SparkzLogo from './SparkzLogo';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { APP_NAV_ITEMS, getAppHeaderCopy } from '@/components/layout/appNavConfig';

const STORAGE_KEY = 'sparkz_sidebar_collapsed';

function NavIcon({ children, active }) {
  return (
    <svg
      className={cn(
        'h-5 w-5 flex-shrink-0',
        active ? 'text-[#16133a]' : 'text-violet-300/80',
      )}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export default function SidebarLayout({ children, activePage }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { title, subtitle } = getAppHeaderCopy(pathname);

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : '?';

  const items = APP_NAV_ITEMS.filter((item) => !item.adminOnly || user?.is_admin);

  const quota = user?.monthly_quota ?? 3;
  const used = user?.analyses_completed_this_month ?? 0;
  const remaining = Math.max(0, quota - used);

  const asideWidth = collapsed ? 'w-[4.25rem]' : 'w-56';

  const go = (path) => {
    navigate(path);
    setMobileNavOpen(false);
  };

  const sidebarFooter = (variant) => {
    const isSheet = variant === 'sheet';
    return (
      <div
        className={cn(
          'flex-shrink-0 space-y-2 border-t border-white/[0.08] bg-black/10',
          isSheet ? 'p-4' : collapsed ? 'p-2' : 'p-4',
        )}
      >
        {!collapsed && !isSheet && (
          <div className="rounded-xl bg-white/[0.06] px-3 py-2.5 ring-1 ring-white/10">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300/80">This month</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-white">
              {remaining} <span className="font-medium text-violet-200/70">/ {quota}</span>
              <span className="mt-0.5 block text-[10px] font-normal text-violet-300/70">analyses left</span>
            </p>
          </div>
        )}
        {collapsed && !isSheet && (
          <div
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.08] text-[10px] font-black tabular-nums text-white ring-1 ring-white/10"
            title={`${remaining} / ${quota} analyses left this month`}
          >
            {remaining}
          </div>
        )}
        {isSheet && (
          <div className="rounded-xl bg-white/[0.06] px-3 py-2.5 ring-1 ring-white/10">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300/80">This month</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-white">
              {remaining} <span className="font-medium text-violet-200/70">/ {quota}</span>
            </p>
          </div>
        )}
        <button
          type="button"
          title={user?.email || 'Account'}
          onClick={() => go('/dashboard')}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl transition-colors hover:bg-white/[0.06]',
            isSheet ? 'p-2' : collapsed ? 'justify-center p-2' : 'p-2',
          )}
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#e6c33a] to-[#c4a82f] text-xs font-black text-[#16133a] shadow-sm">
            {initials}
          </div>
          {(!collapsed || isSheet) && (
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-xs font-semibold text-white">{user?.email || '—'}</p>
              <p className="truncate text-[11px] text-violet-300/80">{user?.is_admin ? 'Administrator' : 'Member'}</p>
            </div>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/login');
            setMobileNavOpen(false);
          }}
          className={cn(
            'w-full rounded-lg text-xs text-violet-300/90 hover:bg-white/[0.06] hover:text-white',
            collapsed && !isSheet ? 'py-2 text-center' : 'px-2 py-1.5 text-left',
          )}
        >
          {collapsed && !isSheet ? 'Out' : 'Sign out'}
        </button>
        {!isSheet && (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden w-full items-center justify-center gap-2 rounded-lg py-2 text-[10px] font-semibold uppercase tracking-wider text-violet-300/80 hover:bg-white/[0.06] hover:text-white md:flex"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className="text-base leading-none">{collapsed ? '»' : '«'}</span>
            {!collapsed && <span>Collapse</span>}
          </button>
        )}
      </div>
    );
  };

  const navList = (variant) => {
    const isSheet = variant === 'sheet';
    return (
      <nav
        className={cn(
          'min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden py-4',
          isSheet ? 'px-3' : 'px-2',
        )}
      >
        {items.map((item) => {
          const isActive = activePage === item.page;
          return (
            <button
              key={item.label}
              type="button"
              title={item.label}
              onClick={() => go(item.path)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200',
                isSheet || !collapsed ? 'px-3 py-2.5' : 'justify-center px-0 py-2.5',
                isActive
                  ? 'bg-[#e6c33a] font-bold text-[#16133a] shadow-md shadow-amber-900/20'
                  : 'text-violet-100/90 hover:bg-white/[0.08] hover:text-white',
              )}
            >
              <NavIcon active={isActive}>{item.icon}</NavIcon>
              {(isSheet || !collapsed) && (
                <span className="truncate text-left leading-snug">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>
    );
  };

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-[#f4f4f8]">
      <aside
        className={cn(
          asideWidth,
          'hidden h-full min-h-0 flex-shrink-0 flex-col border-r border-white/[0.06] bg-[#16133a] shadow-[4px_0_24px_-12px_rgba(15,23,42,0.35)] transition-[width] duration-200 ease-out md:flex',
        )}
      >
        <div
          className={cn(
            'flex-shrink-0 border-b border-white/[0.08] py-5',
            collapsed ? 'flex justify-center px-2' : 'px-5',
          )}
        >
          <SparkzLogo size="sm" variant="light" iconOnly={collapsed} />
          {!collapsed && (
            <p className="ml-[46px] mt-2 text-[10px] font-medium uppercase tracking-[0.2em] text-violet-300/90">
              Disclosure AI
            </p>
          )}
        </div>
        {navList('desktop')}
        {sidebarFooter('desktop')}
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className={cn(
            'flex w-[min(18rem,calc(100vw-1rem))] max-w-[288px] flex-col border-r border-white/10 bg-[#16133a] p-0 text-white',
            '[&>button]:text-white [&>button]:opacity-80 [&>button]:hover:bg-white/10 [&>button]:hover:opacity-100',
          )}
        >
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <div className="flex flex-shrink-0 items-center justify-between border-b border-white/[0.08] px-4 py-4">
            <SparkzLogo size="sm" variant="light" />
          </div>
          <p className="px-4 pb-2 pt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-violet-300/90">
            Disclosure AI
          </p>
          {navList('sheet')}
          {sidebarFooter('sheet')}
        </SheetContent>
      </Sheet>

      <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-20 flex-shrink-0 border-b border-gray-200/80 bg-white/95 px-4 py-3 shadow-sm shadow-gray-200/30 backdrop-blur-md sm:px-6 sm:py-4 md:px-8 md:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="flex min-w-0 items-start gap-2 sm:gap-3">
              <button
                type="button"
                className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200/80 bg-white text-[#16133a] shadow-sm transition-colors hover:bg-gray-50 md:hidden"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" strokeWidth={2} />
              </button>
              <div className="min-w-0 flex-1 pt-0.5 md:pt-0">
                <h1 className="text-lg font-black tracking-tight text-[#16133a] sm:text-xl md:text-2xl">{title}</h1>
                <p className="mt-0.5 max-w-2xl text-xs text-gray-500 sm:mt-1 sm:text-sm">{subtitle}</p>
              </div>
            </div>
            <div className="hidden shrink-0 items-center gap-2 text-xs text-gray-400 sm:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Secure session
            </div>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 md:px-8 lg:py-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
