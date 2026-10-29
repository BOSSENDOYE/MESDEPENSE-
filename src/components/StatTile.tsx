import type { ReactNode } from 'react';
import { mutedText } from './ui';

interface StatTileProps {
  icon: string;
  label: string;
  value: string;
  hint?: ReactNode;
}

/** Tuile d'indicateur clé du tableau de bord. */
export function StatTile({ icon, label, value, hint }: StatTileProps) {
  return (
    <div className="flex flex-col gap-1 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-base dark:bg-emerald-950"
        >
          {icon}
        </span>
        <span className={`text-xs font-semibold uppercase tracking-wide ${mutedText}`}>{label}</span>
      </div>
      <p className="mt-1 truncate text-xl font-bold tabular-nums">{value}</p>
      {hint && <p className={`truncate text-xs ${mutedText}`}>{hint}</p>}
    </div>
  );
}
