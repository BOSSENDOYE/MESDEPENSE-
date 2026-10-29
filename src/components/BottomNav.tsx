import type { ComponentType, SVGProps } from 'react';
import type { Route } from '../hooks/useHashRoute';
import { HomeIcon, ListIcon, SettingsIcon, WalletIcon } from './Icons';

const ITEMS: readonly { route: Route; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { route: 'accueil', label: 'Accueil', Icon: HomeIcon },
  { route: 'depenses', label: 'Dépenses', Icon: ListIcon },
  { route: 'budgets', label: 'Budgets', Icon: WalletIcon },
  { route: 'reglages', label: 'Réglages', Icon: SettingsIcon },
];

export function BottomNav({ current }: { current: Route }) {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {ITEMS.map(({ route, label, Icon }) => {
          const active = route === current;
          return (
            <li key={route}>
              <a
                href={`#/${route}`}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
                  active ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Icon />
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
