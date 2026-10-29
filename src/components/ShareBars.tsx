import { formatFCFA, formatPercent } from '../utils/money';
import { mutedText } from './ui';

export interface ShareBarItem {
  id: string;
  label: string;
  total: number;
  share: number;
}

/** Barres horizontales d'une seule teinte (la longueur porte la valeur, le texte porte l'identité). */
export function ShareBars({ items, label }: { items: readonly ShareBarItem[]; label: string }) {
  const max = items.reduce((m, i) => Math.max(m, i.total), 0);
  return (
    <ul className="space-y-3" aria-label={label}>
      {items.map((item) => (
        <li key={item.id}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-medium">{item.label}</span>
            <span className="shrink-0 tabular-nums">
              <strong>{formatFCFA(item.total)}</strong>{' '}
              <span className={mutedText}>· {formatPercent(item.share * 100)}</span>
            </span>
          </div>
          <div className="mt-1 h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
            <div
              className="h-full rounded-full bg-emerald-600 dark:bg-emerald-400"
              style={{ width: `${max > 0 ? Math.max(2, (item.total / max) * 100) : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
