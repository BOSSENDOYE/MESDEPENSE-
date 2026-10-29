import { budgetLevel, type BudgetLevel } from '../utils/stats';
import { formatFCFA, formatPercent } from '../utils/money';
import { mutedText } from './ui';

const BAR_COLORS: Record<BudgetLevel, string> = {
  ok: 'bg-emerald-600 dark:bg-emerald-400',
  warning: 'bg-amber-500 dark:bg-amber-400',
  over: 'bg-red-600 dark:bg-red-500',
};

const TEXT_COLORS: Record<BudgetLevel, string> = {
  ok: mutedText,
  warning: 'font-semibold text-amber-800 dark:text-amber-300',
  over: 'font-semibold text-red-700 dark:text-red-400',
};

export function budgetStatusText(spent: number, limit: number): string {
  const level = budgetLevel(spent, limit);
  const pct = formatPercent((spent / limit) * 100);
  if (level === 'over') {
    return spent === limit ? `Budget atteint (100 %)` : `Dépassé de ${formatFCFA(spent - limit)} (${pct})`;
  }
  const remaining = `reste ${formatFCFA(limit - spent)}`;
  return level === 'warning' ? `⚠ ${pct} utilisé · ${remaining}` : `${pct} utilisé · ${remaining}`;
}

export function BudgetBar({ spent, limit, label }: { spent: number; limit: number; label: string }) {
  const level = budgetLevel(spent, limit);
  const ratio = limit > 0 ? spent / limit : 0;
  const status = budgetStatusText(spent, limit);
  return (
    <div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, Math.round(ratio * 100))}
        aria-valuetext={status}
        className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
      >
        <div className={`h-full rounded-full ${BAR_COLORS[level]}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
      </div>
      <p className={`mt-1 text-sm ${TEXT_COLORS[level]}`}>{status}</p>
    </div>
  );
}
