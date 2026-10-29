import { useAppData } from '../../hooks/useAppData';
import type { MonthKey } from '../../types';
import { formatMonthName, todayISO } from '../../utils/dates';
import { formatFCFA } from '../../utils/money';
import { balancesByGoal, goalPlan, incomesInMonth, monthMoney, savedInMonth, sortGoals, totalSaved } from '../../utils/savings';
import { sumAmounts } from '../../utils/stats';
import { mutedText } from '../ui';
import { GoalProgress } from './GoalCard';

/** Encart du tableau de bord : épargne du mois, reste à vivre et objectif principal. */
export function SavingsSummaryCard({ month, spent }: { month: MonthKey; spent: number }) {
  const { goals, movements, incomes } = useAppData();
  const income = sumAmounts(incomesInMonth(incomes, month));
  const money = monthMoney(income, spent, savedInMonth(movements, month));
  const balances = balancesByGoal(movements);
  const focus = sortGoals(goals, balances).find((g) => g.target !== null);

  if (goals.length === 0 && income === 0) {
    return (
      <a
        href="#/epargne"
        className="flex min-h-14 items-center gap-3 rounded-3xl bg-teal-50 p-4 text-teal-950 ring-1 ring-teal-200 hover:bg-teal-100 dark:bg-teal-950 dark:text-teal-50 dark:ring-teal-900"
      >
        <span aria-hidden="true" className="text-3xl">
          💰
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Commencez à épargner</span>
          <span className="block text-sm">Créez un objectif (Tabaski, urgence…) et suivez votre reste à vivre.</span>
        </span>
        <span aria-hidden="true">→</span>
      </a>
    );
  }

  return (
    <section aria-labelledby="epargne-accueil" className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="mb-2 flex items-center justify-between">
        <h2 id="epargne-accueil" className="text-lg font-semibold">
          💰 Épargne
        </h2>
        <a href="#/epargne" className="flex min-h-11 items-center px-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          Voir →
        </a>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        <div>
          <dt className={`text-xs font-semibold uppercase tracking-wide ${mutedText}`}>En {formatMonthName(month)}</dt>
          <dd className="text-xl font-bold tabular-nums">{formatFCFA(money.saved)}</dd>
          <dd className={`text-xs ${mutedText}`}>Total : {formatFCFA(totalSaved(movements))}</dd>
        </div>
        <div>
          <dt className={`text-xs font-semibold uppercase tracking-wide ${mutedText}`}>Reste à vivre</dt>
          <dd className={`text-xl font-bold tabular-nums ${money.left < 0 ? 'text-red-700 dark:text-red-400' : ''}`}>
            {income > 0 ? formatFCFA(money.left) : '—'}
          </dd>
          <dd className={`text-xs ${mutedText}`}>{income > 0 ? `sur ${formatFCFA(income)} de revenus` : 'ajoutez vos revenus'}</dd>
        </div>
      </dl>
      {focus && (
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <p className="mb-1 truncate text-sm font-medium">
            {focus.icon} {focus.name}
          </p>
          <GoalProgress goal={focus} plan={goalPlan(focus, balances.get(focus.id) ?? 0, todayISO())} />
        </div>
      )}
    </section>
  );
}
