import { useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { PlusIcon } from '../components/Icons';
import { MonthSwitcher } from '../components/MonthSwitcher';
import { GoalAdvice, GoalProgress } from '../components/savings/GoalCard';
import { GoalDetail } from '../components/savings/GoalDetail';
import { GoalEditor, type GoalPreset } from '../components/savings/GoalEditor';
import { IncomeEditor } from '../components/savings/IncomeEditor';
import { MovementEditor, type MovementKind } from '../components/savings/MovementEditor';
import { Button, Card, PageHeader, mutedText } from '../components/ui';
import { useAppData } from '../hooks/useAppData';
import type { Income, SavingsGoal } from '../types';
import { currentMonthKey, formatDayHeading, formatMonthName, shiftMonth, todayISO } from '../utils/dates';
import { formatFCFA, formatPercent } from '../utils/money';
import {
  balancesByGoal,
  goalPlan,
  incomesInMonth,
  monthMoney,
  savedInMonth,
  sortGoals,
  totalSaved,
} from '../utils/savings';
import { expensesInMonth, sumAmounts } from '../utils/stats';

const GOAL_SUGGESTIONS: readonly GoalPreset[] = [
  { name: "Fonds d'urgence", icon: '🛟' },
  { name: 'Tabaski', icon: '🐑' },
  { name: 'Téléphone', icon: '📱' },
  { name: 'Voyage', icon: '✈️' },
];

type Dialog =
  | { kind: 'goal'; goal: SavingsGoal | null; preset?: GoalPreset }
  | { kind: 'detail'; goalId: string }
  | { kind: 'move'; goalId: string; move: MovementKind }
  | { kind: 'income'; income: Income | null };

export function SavingsPage() {
  const { expenses, goals, movements, incomes } = useAppData();
  const [month, setMonth] = useState(currentMonthKey);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const today = todayISO();

  const balances = useMemo(() => balancesByGoal(movements), [movements]);
  const sortedGoals = useMemo(() => sortGoals(goals, balances), [goals, balances]);
  const monthIncomes = useMemo(
    () => incomesInMonth(incomes, month).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [incomes, month],
  );
  const money = monthMoney(sumAmounts(monthIncomes), sumAmounts(expensesInMonth(expenses, month)), savedInMonth(movements, month));
  const prevMoney = monthMoney(
    sumAmounts(incomesInMonth(incomes, shiftMonth(month, -1))),
    0,
    savedInMonth(movements, shiftMonth(month, -1)),
  );
  const monthName = formatMonthName(month);
  const goalById = (id: string) => goals.find((g) => g.id === id) ?? null;

  return (
    <div className="space-y-4">
      <PageHeader title="Épargne" />
      <MonthSwitcher month={month} onChange={setMonth} />

      {/* Bilan du mois */}
      <section
        aria-labelledby="bilan-titre"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-700 via-teal-800 to-emerald-900 p-5 text-white shadow-lg shadow-teal-900/20 dark:from-teal-800 dark:via-teal-900 dark:to-slate-900"
      >
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
        <h2 id="bilan-titre" className="relative text-sm font-medium text-teal-50">
          Reste à vivre · {monthName}
        </h2>
        <p className="relative mt-1 text-4xl font-extrabold tracking-tight tabular-nums">
          {money.income > 0 ? formatFCFA(money.left) : '—'}
        </p>
        <dl className="relative mt-4 grid grid-cols-3 gap-1.5 text-[0.8125rem] min-[380px]:gap-2 min-[380px]:text-sm">
          <div className="min-w-0 rounded-2xl bg-white/15 px-2 py-2 min-[380px]:px-3">
            <dt className="text-teal-50">💵 Revenus</dt>
            <dd className="font-semibold tabular-nums">{formatFCFA(money.income)}</dd>
          </div>
          <div className="min-w-0 rounded-2xl bg-white/15 px-2 py-2 min-[380px]:px-3">
            <dt className="text-teal-50">🧾 Dépenses</dt>
            <dd className="font-semibold tabular-nums">{formatFCFA(money.spent)}</dd>
          </div>
          <div className="min-w-0 rounded-2xl bg-white/15 px-2 py-2 min-[380px]:px-3">
            <dt className="text-teal-50">🐷 Épargne</dt>
            <dd className="font-semibold tabular-nums">{formatFCFA(money.saved)}</dd>
          </div>
        </dl>
        <p className="relative mt-3 text-sm text-teal-50">
          {money.income === 0
            ? `Ajoutez vos revenus de ${monthName} pour voir ce qu'il vous reste.`
            : money.left < 0
              ? `⚠ Vous avez dépensé et épargné ${formatFCFA(-money.left)} de plus que vos revenus.`
              : money.savingsRate !== null
                ? `Vous avez épargné ${formatPercent(money.savingsRate)} de vos revenus${
                    prevMoney.savingsRate !== null ? ` (${formatPercent(prevMoney.savingsRate)} le mois d'avant)` : ''
                  }.`
                : ''}
        </p>
      </section>

      {/* Revenus */}
      <Card>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Revenus de {monthName}</h2>
          <Button variant="ghost" onClick={() => setDialog({ kind: 'income', income: null })}>
            <PlusIcon width={20} height={20} /> Ajouter
          </Button>
        </div>
        {monthIncomes.length === 0 ? (
          <p className={`py-2 text-sm ${mutedText}`}>Salaire, commerce, transfert reçu… Notez l'argent qui rentre.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {monthIncomes.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => setDialog({ kind: 'income', income: i })}
                  className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-1 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label={`Modifier le revenu ${i.source} ${formatFCFA(i.amount)}`}
                >
                  <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-xl dark:bg-emerald-950">
                    💵
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{i.source}</span>
                    <span className={`block truncate text-sm ${mutedText}`}>
                      {formatDayHeading(i.date)}
                      {i.note ? ` · ${i.note}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-emerald-800 dark:text-emerald-300">+{formatFCFA(i.amount)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Objectifs */}
      <section aria-labelledby="objectifs-titre" className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 id="objectifs-titre" className="text-lg font-semibold">
              Mes objectifs
            </h2>
            {goals.length > 0 && (
              <p className={`text-sm ${mutedText}`}>
                Total épargné : <strong className="tabular-nums text-slate-900 dark:text-slate-100">{formatFCFA(totalSaved(movements))}</strong>
              </p>
            )}
          </div>
          {goals.length > 0 && (
            <Button variant="ghost" onClick={() => setDialog({ kind: 'goal', goal: null })}>
              <PlusIcon width={20} height={20} /> Nouvel
            </Button>
          )}
        </div>

        {goals.length === 0 ? (
          <EmptyState
            icon="🐷"
            title="Aucun objectif d'épargne"
            action={<Button onClick={() => setDialog({ kind: 'goal', goal: null })}>Créer un objectif</Button>}
          >
            Tabaski, fonds d'urgence, téléphone… Créez un objectif et notez ce que vous mettez de côté.
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {sortedGoals.map((g) => {
              const balance = balances.get(g.id) ?? 0;
              const plan = goalPlan(g, balance, today);
              return (
                <li key={g.id}>
                  <Card>
                    <button
                      type="button"
                      onClick={() => setDialog({ kind: 'detail', goalId: g.id })}
                      className="-m-1 flex w-[calc(100%+0.5rem)] items-center gap-3 rounded-2xl p-1 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                      aria-label={`Voir l'objectif ${g.name}`}
                    >
                      <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-2xl dark:bg-teal-950">
                        {g.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{g.name}</span>
                        <span className={`block text-sm tabular-nums ${mutedText}`}>
                          <strong className="text-slate-900 dark:text-slate-100">{formatFCFA(balance)}</strong>
                          {g.target !== null ? ` / ${formatFCFA(g.target)}` : ' · épargne libre'}
                        </span>
                      </span>
                    </button>
                    <div className="mt-3 space-y-2">
                      <GoalProgress goal={g} plan={plan} />
                      <GoalAdvice goal={g} plan={plan} />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button className="flex-1" onClick={() => setDialog({ kind: 'move', goalId: g.id, move: 'deposit' })}>
                        + Verser
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={balance <= 0}
                        onClick={() => setDialog({ kind: 'move', goalId: g.id, move: 'withdraw' })}
                      >
                        Retirer
                      </Button>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

        {GOAL_SUGGESTIONS.some((s) => !goals.some((g) => g.name === s.name)) && (
          <div className="flex flex-wrap gap-2 px-1">
            {GOAL_SUGGESTIONS.filter((s) => !goals.some((g) => g.name === s.name)).map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => setDialog({ kind: 'goal', goal: null, preset: s })}
                className="min-h-11 rounded-full border-2 border-dashed border-teal-700 px-4 text-sm font-semibold text-teal-800 dark:border-teal-400 dark:text-teal-300"
              >
                + {s.icon} {s.name}
              </button>
            ))}
          </div>
        )}
      </section>

      <p className={`px-2 text-center text-xs ${mutedText}`}>
        L'application note votre épargne pour vous aider à la suivre ; elle ne déplace pas d'argent.
      </p>

      {dialog?.kind === 'goal' && <GoalEditor goal={dialog.goal} preset={dialog.preset} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'income' && <IncomeEditor income={dialog.income} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'detail' && goalById(dialog.goalId) && (
        <GoalDetail
          goal={goalById(dialog.goalId)!}
          onClose={() => setDialog(null)}
          onMove={(move) => setDialog({ kind: 'move', goalId: dialog.goalId, move })}
          onEdit={() => setDialog({ kind: 'goal', goal: goalById(dialog.goalId) })}
        />
      )}
      {dialog?.kind === 'move' && goalById(dialog.goalId) && (
        <MovementEditor
          goal={goalById(dialog.goalId)!}
          kind={dialog.move}
          balance={balances.get(dialog.goalId) ?? 0}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
