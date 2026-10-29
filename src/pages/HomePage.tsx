import { useMemo, useState } from 'react';
import { budgetStatusText, BudgetBar } from '../components/BudgetBar';
import { CategoryIcon } from '../components/CategoryIcon';
import { CategoryPieChart } from '../components/CategoryPieChart';
import { DailyBarChart } from '../components/DailyBarChart';
import { EmptyState } from '../components/EmptyState';
import { ExpenseRow } from '../components/ExpenseRow';
import { AlertIcon, PlusIcon } from '../components/Icons';
import { MonthSwitcher } from '../components/MonthSwitcher';
import { ShareBars } from '../components/ShareBars';
import { StatTile } from '../components/StatTile';
import { Button, Card, mutedText } from '../components/ui';
import { useAppData } from '../hooks/useAppData';
import { greetingLine, useUserName, useUserPhoto } from '../hooks/useUserName';
import { Avatar } from '../components/Avatar';
import type { Expense } from '../types';
import { paymentMethodLabel } from '../utils/constants';
import {
  currentMonthKey,
  dayOfMonthOf,
  formatLongDate,
  formatMonthLabel,
  formatMonthName,
  shiftMonth,
  todayISO,
} from '../utils/dates';
import { formatCompact, formatFCFA, formatPercent } from '../utils/money';
import {
  budgetLevel,
  budgetProgress,
  categoryBreakdown,
  dailyTotals,
  expensesInMonth,
  groupByDay,
  largestExpense,
  monthPace,
  paymentBreakdown,
  percentChange,
  subcategoryBreakdown,
  sumAmounts,
  totalUpToDay,
} from '../utils/stats';
import { subcategoryName } from '../utils/categories';
import { pluralize } from '../utils/text';

interface HomePageProps {
  onAdd: () => void;
  onEdit: (expense: Expense) => void;
}

export function HomePage({ onAdd, onEdit }: HomePageProps) {
  const { expenses, budgets, totalBudget, getCategory } = useAppData();
  const [userName] = useUserName();
  const [userPhoto] = useUserPhoto();
  const [month, setMonth] = useState(currentMonthKey);
  const today = todayISO();

  const stats = useMemo(() => {
    const monthExpenses = expensesInMonth(expenses, month);
    const prevMonth = shiftMonth(month, -1);
    const prevExpenses = expensesInMonth(expenses, prevMonth);
    // Mois en cours : on compare à la même période du mois précédent (du 1er au jour actuel).
    const isCurrent = month === currentMonthKey();
    const cutoff = isCurrent ? dayOfMonthOf(today) : 31;
    const total = sumAmounts(monthExpenses);
    const progress = budgetProgress(budgets, monthExpenses);
    return {
      monthExpenses,
      total,
      prevMonth,
      isCurrent,
      change: percentChange(totalUpToDay(monthExpenses, cutoff), totalUpToDay(prevExpenses, cutoff)),
      pace: monthPace(total, month, today),
      breakdown: categoryBreakdown(monthExpenses),
      payments: paymentBreakdown(monthExpenses),
      types: subcategoryBreakdown(monthExpenses),
      daily: dailyTotals(monthExpenses, month),
      biggest: largestExpense(monthExpenses),
      recurringCount: monthExpenses.filter((e) => e.recurringId).length,
      // Budget du mois s'il est défini (toutes dépenses), sinon somme des budgets par catégorie.
      budgetLabel: totalBudget !== null ? 'Budget du mois' : 'Budget global',
      budgetLimit: totalBudget ?? progress.reduce((s, b) => s + b.limit, 0),
      budgetSpent: totalBudget !== null ? total : progress.reduce((s, b) => s + b.spent, 0),
      alerts: progress.filter((b) => b.level !== 'ok').sort((a, b) => b.ratio - a.ratio),
      recent: groupByDay(monthExpenses).flatMap((g) => g.expenses).slice(0, 5),
    };
  }, [expenses, budgets, totalBudget, month, today]);

  const prevName = formatMonthName(stats.prevMonth);
  const topCategory = stats.breakdown[0];
  const hasData = stats.monthExpenses.length > 0;

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-2 pb-1 pt-2">
        <div className="flex items-center gap-3">
          <img
            src="/logo-app.png"
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 rounded-2xl bg-white object-contain p-1 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800"
          />
          <div>
            <p className={`text-sm ${mutedText}`}>{greetingLine(userName)}</p>
            <h1 className="whitespace-nowrap text-xl font-bold">Tableau de bord</h1>
          </div>
        </div>
        <a href="#/reglages" className="shrink-0 rounded-full" aria-label="Mon profil (Réglages)" title={formatLongDate(today)}>
          <Avatar photo={userPhoto} name={userName} className="h-11 w-11 text-lg ring-2 ring-white shadow-sm dark:ring-slate-800" />
        </a>
      </header>

      <MonthSwitcher month={month} onChange={setMonth} />

      {/* Carte principale */}
      <section
        aria-labelledby="total-titre"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 p-5 text-white shadow-lg shadow-emerald-900/20 dark:from-emerald-800 dark:via-emerald-900 dark:to-slate-900"
      >
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-10 h-32 w-32 rounded-full bg-white/5" />

        <div className="relative flex items-start justify-between gap-2">
          <h2 id="total-titre" className="text-sm font-medium text-emerald-50">
            Dépensé · {formatMonthLabel(month)}
          </h2>
          <button
            type="button"
            onClick={onAdd}
            className="flex min-h-11 items-center gap-1 rounded-full bg-white/15 px-3 text-sm font-semibold hover:bg-white/25"
          >
            <PlusIcon width={18} height={18} /> Ajouter
          </button>
        </div>

        <p className="relative mt-1 text-4xl font-extrabold tracking-tight tabular-nums">
          {formatFCFA(stats.total)}
        </p>

        <p className="relative mt-3 inline-flex flex-wrap items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-sm">
          {stats.change === null ? (
            <span>Pas de dépense en {prevName} pour comparer</span>
          ) : stats.change === 0 ? (
            <span>= identique à {prevName}</span>
          ) : (
            <>
              <strong>
                {stats.change > 0 ? '▲ +' : '▼ −'}
                {formatPercent(Math.abs(stats.change))}
              </strong>
              <span>
                {stats.change > 0 ? 'de plus' : 'de moins'} qu'en {prevName}
                {stats.isCurrent ? ' (même période)' : ''}
              </span>
            </>
          )}
        </p>

        {stats.budgetLimit > 0 && (
          <div className="relative mt-4">
            <div className="flex items-baseline justify-between text-sm text-emerald-50">
              <span>{stats.budgetLabel}</span>
              <span className="tabular-nums">
                {formatFCFA(stats.budgetSpent)} / {formatFCFA(stats.budgetLimit)}
              </span>
            </div>
            <div
              className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/20"
              role="progressbar"
              aria-label={stats.budgetLabel}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(100, Math.round((stats.budgetSpent / stats.budgetLimit) * 100))}
              aria-valuetext={budgetStatusText(stats.budgetSpent, stats.budgetLimit)}
            >
              <div
                className={`h-full rounded-full ${
                  { ok: 'bg-white', warning: 'bg-amber-300', over: 'bg-red-300' }[budgetLevel(stats.budgetSpent, stats.budgetLimit)]
                }`}
                style={{ width: `${Math.min(100, (stats.budgetSpent / stats.budgetLimit) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-emerald-50">{budgetStatusText(stats.budgetSpent, stats.budgetLimit)}</p>
          </div>
        )}
      </section>

      {/* Indicateurs clés */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          icon="📅"
          label="Par jour"
          value={formatFCFA(stats.pace.dailyAverage)}
          hint={stats.pace.elapsedDays > 0 ? `moyenne sur ${pluralize(stats.pace.elapsedDays, 'jour', 'jours')}` : 'mois à venir'}
        />
        {stats.isCurrent ? (
          <StatTile icon="🔮" label="Fin de mois" value={`≈ ${formatFCFA(stats.pace.projected)}`} hint="au rythme actuel" />
        ) : (
          <StatTile
            icon="🗓️"
            label="Jours actifs"
            value={String(stats.daily.filter((d) => d.total > 0).length)}
            hint={`sur ${stats.daily.length} jours`}
          />
        )}
        <StatTile
          icon="🏆"
          label="Top catégorie"
          value={topCategory ? `${getCategory(topCategory.categoryId).icon} ${getCategory(topCategory.categoryId).name}` : '—'}
          hint={topCategory ? `${formatFCFA(topCategory.total)} · ${formatPercent(topCategory.share * 100)}` : 'aucune dépense'}
        />
        <StatTile
          icon="🧾"
          label="Dépenses"
          value={String(stats.monthExpenses.length)}
          hint={
            stats.biggest
              ? `max : ${formatCompact(stats.biggest.amount)} FCFA${stats.recurringCount > 0 ? ` · ${stats.recurringCount} auto` : ''}`
              : 'aucune saisie'
          }
        />
      </div>

      {!hasData ? (
        <EmptyState icon="🧾" title="Aucune dépense ce mois-ci" action={<Button onClick={onAdd}>Ajouter une dépense</Button>}>
          Touchez le bouton « + » pour enregistrer votre première dépense de {formatMonthName(month)}.
        </EmptyState>
      ) : (
        <>
          {stats.alerts.length > 0 && (
            <Card className="border-l-4 border-amber-500 dark:border-amber-400">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <AlertIcon className="text-amber-700 dark:text-amber-400" width={22} height={22} />
                Alertes budget
              </h2>
              <ul className="space-y-4">
                {stats.alerts.map((b) => {
                  const category = getCategory(b.categoryId);
                  return (
                    <li key={b.categoryId} className="flex items-start gap-3">
                      <CategoryIcon category={category} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{category.name}</p>
                        <BudgetBar spent={b.spent} limit={b.limit} label={`Budget ${category.name}`} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          <Card>
            <h2 className="mb-1 text-lg font-semibold">Répartition par catégorie</h2>
            <CategoryPieChart shares={stats.breakdown} getCategory={getCategory} total={stats.total} />
          </Card>

          <Card>
            <h2 className="mb-2 text-lg font-semibold">Dépenses par jour</h2>
            <DailyBarChart data={stats.daily} month={month} average={stats.pace.dailyAverage} today={today} />
          </Card>

          {stats.types.some((t) => t.subcategoryId !== null) && (
            <Card>
              <h2 className="text-lg font-semibold">Détail par type</h2>
              <p className={`mb-3 text-sm ${mutedText}`}>Où part l'argent, précisément (les 6 premiers).</p>
              <ShareBars
                label="Dépenses par type"
                items={stats.types.slice(0, 6).map((t) => {
                  const category = getCategory(t.categoryId);
                  const type = subcategoryName(category, t.subcategoryId ?? undefined);
                  return {
                    id: `${t.categoryId}/${t.subcategoryId ?? ''}`,
                    label: `${category.icon} ${category.name} · ${type ?? 'sans type'}`,
                    total: t.total,
                    share: t.share,
                  };
                })}
              />
            </Card>
          )}

          <Card>
            <h2 className="mb-3 text-lg font-semibold">Moyens de paiement</h2>
            <ShareBars
              label="Répartition par moyen de paiement"
              items={stats.payments.map((p) => ({ id: p.method, label: paymentMethodLabel(p.method), total: p.total, share: p.share }))}
            />
          </Card>

          <Card>
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Dernières dépenses</h2>
              <a href="#/depenses" className="flex min-h-11 items-center px-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Tout voir →
              </a>
            </div>
            <ul>
              {stats.recent.map((e) => (
                <ExpenseRow key={e.id} expense={e} category={getCategory(e.categoryId)} onEdit={onEdit} />
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
