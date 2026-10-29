import { useMemo, useState, type FormEvent } from 'react';
import { AmountInput } from '../components/AmountInput';
import { BudgetBar } from '../components/BudgetBar';
import { CategoryIcon } from '../components/CategoryIcon';
import { Modal } from '../components/Modal';
import { MonthSwitcher } from '../components/MonthSwitcher';
import { Button, Card, FieldError, PageHeader, mutedText } from '../components/ui';
import { removeBudget, setBudget, setSavingsBudget, setTotalBudget } from '../db/budgets';
import { useAppData } from '../hooks/useAppData';
import { useToast } from '../hooks/useToast';
import type { Category } from '../types';
import { currentMonthKey, formatMonthName } from '../utils/dates';
import { formatFCFA, formatPercent, validateAmount } from '../utils/money';
import { savedInMonth } from '../utils/savings';
import { budgetAllocation, expensesInMonth, shareOfTotal, sumAmounts, totalsByCategory } from '../utils/stats';

type Editing = { kind: 'total' } | { kind: 'savings' } | { kind: 'category'; category: Category };

/** Couleur de la part « épargne » dans la barre de répartition. */
const SAVINGS_COLOR = '#0f766e';

export function BudgetsPage() {
  const { expenses, categories, budgets, totalBudget, savingsBudget, movements } = useAppData();
  const [month, setMonth] = useState(currentMonthKey);
  const [editing, setEditing] = useState<Editing | null>(null);

  const limits = useMemo(() => new Map(budgets.map((b) => [b.categoryId, b.monthlyLimit])), [budgets]);
  const monthExpenses = useMemo(() => expensesInMonth(expenses, month), [expenses, month]);
  const spentByCategory = useMemo(() => totalsByCategory(monthExpenses), [monthExpenses]);

  const budgeted = categories
    .filter((c) => limits.has(c.id))
    .sort((a, b) => (limits.get(b.id) ?? 0) - (limits.get(a.id) ?? 0));
  const unbudgeted = categories.filter((c) => !limits.has(c.id));
  const allocatedBudgets = budgets.filter((b) => categories.some((c) => c.id === b.categoryId));
  const savings = totalBudget !== null ? (savingsBudget ?? 0) : 0;
  const allocation = totalBudget !== null ? budgetAllocation(totalBudget, allocatedBudgets, savings) : null;
  const sumLimits = budgeted.reduce((sum, c) => sum + (limits.get(c.id) ?? 0), 0);
  const spentInBudgeted = sumAmounts(budgeted.map((c) => ({ amount: spentByCategory.get(c.id) ?? 0 })));

  return (
    <div className="space-y-4">
      <PageHeader title="Budgets" />
      <MonthSwitcher month={month} onChange={setMonth} />

      {totalBudget === null || allocation === null ? (
        <Card className="border-l-4 border-emerald-600 dark:border-emerald-400">
          <h2 className="text-lg font-semibold">💰 Budget du mois</h2>
          <p className={`mt-1 text-sm ${mutedText}`}>
            Combien voulez-vous dépenser au maximum chaque mois ? Fixez ce montant, puis répartissez-le entre vos
            catégories (transport, nourriture…).
          </p>
          <Button className="mt-3" block onClick={() => setEditing({ kind: 'total' })}>
            Définir mon budget du mois
          </Button>
          {budgeted.length > 0 && (
            <div className="mt-4">
              <p className={`text-sm ${mutedText}`}>
                Catégories budgétées : {formatFCFA(spentInBudgeted)} dépensés sur {formatFCFA(sumLimits)}
              </p>
              <div className="mt-1">
                <BudgetBar spent={spentInBudgeted} limit={sumLimits} label="Total des catégories budgétées" />
              </div>
            </div>
          )}
        </Card>
      ) : (
        <TotalBudgetCard
          total={totalBudget}
          spent={sumAmounts(monthExpenses)}
          monthName={formatMonthName(month)}
          allocation={allocation}
          savedThisMonth={savedInMonth(movements, month)}
          segments={budgeted.map((c) => ({ category: c, limit: limits.get(c.id) ?? 0 }))}
          onEdit={() => setEditing({ kind: 'total' })}
          onEditSavings={() => setEditing({ kind: 'savings' })}
        />
      )}

      {budgeted.length > 0 && (
        <section aria-labelledby="titre-repartition" className="space-y-3">
          <h2 id="titre-repartition" className="px-1 text-lg font-semibold">
            Répartition par catégorie
          </h2>
          <ul className="space-y-3">
            {budgeted.map((c) => {
              const limit = limits.get(c.id) ?? 0;
              const spent = spentByCategory.get(c.id) ?? 0;
              return (
                <li key={c.id}>
                  <Card>
                    <div className="mb-2 flex items-center gap-3">
                      <CategoryIcon category={c} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{c.name}</p>
                        <p className={`text-sm tabular-nums ${mutedText}`}>
                          {formatFCFA(spent)} / {formatFCFA(limit)}
                          {totalBudget ? ` · ${formatPercent((limit / totalBudget) * 100)} du budget` : ''}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => setEditing({ kind: 'category', category: c })}
                        aria-label={`Modifier le budget ${c.name}`}
                      >
                        Modifier
                      </Button>
                    </div>
                    <BudgetBar spent={spent} limit={limit} label={`Budget ${c.name}`} />
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {unbudgeted.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold">{budgeted.length > 0 ? 'Sans budget' : 'Répartir par catégorie'}</h2>
          {allocation && allocation.remaining > 0 && (
            <p className={`mt-1 text-sm ${mutedText}`}>
              Il vous reste <strong className="text-emerald-800 dark:text-emerald-300">{formatFCFA(allocation.remaining)}</strong> à
              répartir.
            </p>
          )}
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {unbudgeted.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2">
                <CategoryIcon category={c} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className={`text-sm tabular-nums ${mutedText}`}>{formatFCFA(spentByCategory.get(c.id) ?? 0)} ce mois</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setEditing({ kind: 'category', category: c })}
                  aria-label={`Définir un budget pour ${c.name}`}
                >
                  Définir
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {editing?.kind === 'total' && (
        <TotalBudgetEditor current={totalBudget} allocated={(allocation?.allocated ?? sumLimits) + savings} onClose={() => setEditing(null)} />
      )}
      {editing?.kind === 'savings' && totalBudget !== null && (
        <SavingsBudgetEditor
          current={savingsBudget}
          totalBudget={totalBudget}
          allocated={allocation?.allocated ?? 0}
          onClose={() => setEditing(null)}
        />
      )}
      {editing?.kind === 'category' && (
        <BudgetEditor
          category={editing.category}
          current={limits.get(editing.category.id) ?? null}
          totalBudget={totalBudget}
          allocatedOthers={savings + sumLimits - (limits.get(editing.category.id) ?? 0)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

interface TotalBudgetCardProps {
  total: number;
  spent: number;
  monthName: string;
  allocation: { savings: number; allocated: number; remaining: number };
  savedThisMonth: number;
  segments: { category: Category; limit: number }[];
  onEdit: () => void;
  onEditSavings: () => void;
}

/** Budget total du mois : épargne mise de côté, dépenses face au reste, puis répartition entre les catégories. */
function TotalBudgetCard({ total, spent, monthName, allocation, savedThisMonth, segments, onEdit, onEditSavings }: TotalBudgetCardProps) {
  const scale = Math.max(total, allocation.savings + allocation.allocated);
  const spendable = Math.max(0, total - allocation.savings);
  const saved = Math.max(0, savedThisMonth);
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className={`text-sm font-medium ${mutedText}`}>💰 Budget du mois</h2>
          <p className="mt-1 text-3xl font-bold tabular-nums">{formatFCFA(total)}</p>
        </div>
        <Button variant="ghost" onClick={onEdit} aria-label="Modifier le budget du mois">
          Modifier
        </Button>
      </div>

      <div className="mt-3">
        <p className={`mb-1 text-sm ${mutedText}`}>
          Dépensé en {monthName} : <strong className="text-slate-900 dark:text-slate-100">{formatFCFA(spent)}</strong>
          {allocation.savings > 0 && <> sur {formatFCFA(spendable)} à dépenser</>}
        </p>
        <BudgetBar spent={spent} limit={spendable} label="Budget à dépenser du mois" />
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-teal-50 p-3 dark:bg-teal-950">
        <span aria-hidden="true" className="text-2xl">
          🐷
        </span>
        <div className="min-w-0 flex-1">
          {allocation.savings > 0 ? (
            <>
              <p className="font-semibold text-teal-950 dark:text-teal-50">
                Épargne : {formatFCFA(allocation.savings)}{' '}
                <span className="font-normal">({formatPercent((allocation.savings / total) * 100)})</span>
              </p>
              <p className="text-sm text-teal-900 dark:text-teal-100">
                {saved >= allocation.savings
                  ? `✅ Mis de côté en ${monthName} : ${formatFCFA(saved)}`
                  : `Mis de côté en ${monthName} : ${formatFCFA(saved)} · reste ${formatFCFA(allocation.savings - saved)}`}
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-teal-950 dark:text-teal-50">Payez-vous en premier</p>
              <p className="text-sm text-teal-900 dark:text-teal-100">
                Réservez une part pour l'épargne avant de répartir le reste.
              </p>
            </>
          )}
        </div>
        <Button variant="ghost" onClick={onEditSavings} aria-label="Part d'épargne du budget">
          {allocation.savings > 0 ? 'Modifier' : 'Définir'}
        </Button>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">Répartition</h3>
          <p className={`text-sm tabular-nums ${mutedText}`}>
            {formatFCFA(allocation.allocated)} réparti{allocation.allocated > 1 ? 's' : ''}
          </p>
        </div>

        {/* Barre empilée : une part par catégorie (sa couleur), le gris = reste à répartir. */}
        <div
          className="mt-2 flex h-4 w-full gap-[2px] overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          role="img"
          aria-label={`Répartition : ${allocation.savings > 0 ? `épargne ${formatFCFA(allocation.savings)}, ` : ''}${segments
            .map((s) => `${s.category.name} ${formatFCFA(s.limit)}`)
            .join(', ')}${
            allocation.remaining > 0 ? `, reste à répartir ${formatFCFA(allocation.remaining)}` : ''
          }`}
        >
          {allocation.savings > 0 && (
            <div
              className="h-full first:rounded-l-full"
              style={{ width: `${(allocation.savings / scale) * 100}%`, backgroundColor: SAVINGS_COLOR }}
              title={`Épargne : ${formatFCFA(allocation.savings)}`}
            />
          )}
          {segments.map((s) => (
            <div
              key={s.category.id}
              className="h-full first:rounded-l-full"
              style={{ width: `${(s.limit / scale) * 100}%`, backgroundColor: s.category.color }}
              title={`${s.category.name} : ${formatFCFA(s.limit)}`}
            />
          ))}
        </div>

        {(segments.length > 0 || allocation.savings > 0) && (
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-hidden="true">
            {allocation.savings > 0 && (
              <li className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SAVINGS_COLOR }} />
                🐷 Épargne · {formatPercent((allocation.savings / total) * 100)}
              </li>
            )}
            {segments.map((s) => (
              <li key={s.category.id} className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.category.color }} />
                {s.category.icon} {s.category.name} · {formatPercent((s.limit / total) * 100)}
              </li>
            ))}
          </ul>
        )}

        <p
          className={`mt-3 rounded-2xl px-3 py-2 text-sm font-medium ${
            allocation.remaining >= 0
              ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100'
              : 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100'
          }`}
        >
          {allocation.remaining > 0
            ? `Reste à répartir : ${formatFCFA(allocation.remaining)}`
            : allocation.remaining === 0
              ? '✅ Tout votre budget est réparti.'
              : `⚠ Vous avez réparti ${formatFCFA(-allocation.remaining)} de plus que votre budget du mois.`}
        </p>
      </div>
    </Card>
  );
}

function TotalBudgetEditor({ current, allocated, onClose }: { current: number | null; allocated: number; onClose: () => void }) {
  const { reload } = useAppData();
  const { showToast } = useToast();
  const [value, setValue] = useState(current === null ? '' : String(current));
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const check = validateAmount(value);

  async function run(amount: number | null, message: string) {
    try {
      await setTotalBudget(amount);
      await reload();
      showToast(message);
      onClose();
    } catch (err) {
      console.error(err);
      setError("L'enregistrement a échoué. Réessayez.");
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!check.ok) return;
    void run(check.value, `Budget du mois : ${formatFCFA(check.value)}.`);
  }

  return (
    <Modal
      title="Budget du mois"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          {current !== null && (
            <Button variant="secondary" onClick={() => void run(null, 'Budget du mois retiré.')}>
              Retirer
            </Button>
          )}
          <Button type="submit" form="formulaire-budget-total" block>
            Enregistrer
          </Button>
        </div>
      }
    >
      <form id="formulaire-budget-total" onSubmit={handleSubmit} noValidate className="space-y-3">
        <AmountInput
          id="budget-total"
          label="Montant maximum à dépenser par mois"
          value={value}
          onChange={setValue}
          error={submitted && !check.ok ? check.error : null}
        />
        <p className={`text-sm ${mutedText}`}>
          {allocated > 0
            ? `Vous avez déjà réparti ${formatFCFA(allocated)} entre vos catégories.`
            : 'Ensuite, répartissez ce montant entre vos catégories (transport, nourriture…).'}
        </p>
        {check.ok && allocated > check.value && (
          <p className="rounded-2xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            ⚠ C'est moins que ce que vous avez déjà réparti ({formatFCFA(allocated)}) : pensez à ajuster vos catégories.
          </p>
        )}
        {error && <FieldError>{error}</FieldError>}
      </form>
    </Modal>
  );
}

const SAVINGS_PERCENT_CHOICES = [5, 10, 15, 20, 25] as const;

interface SavingsBudgetEditorProps {
  current: number | null;
  totalBudget: number;
  /** Montant déjà réparti entre les catégories. */
  allocated: number;
  onClose: () => void;
}

/** Part du budget du mois mise de côté pour l'épargne, avant la répartition par catégorie. */
function SavingsBudgetEditor({ current, totalBudget, allocated, onClose }: SavingsBudgetEditorProps) {
  const { reload } = useAppData();
  const { showToast } = useToast();
  const [value, setValue] = useState(current === null ? '' : String(current));
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const check = validateAmount(value);

  async function run(amount: number | null, message: string) {
    try {
      await setSavingsBudget(amount);
      await reload();
      showToast(message);
      onClose();
    } catch (err) {
      console.error(err);
      setError("L'enregistrement a échoué. Réessayez.");
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!check.ok) return;
    void run(check.value, `Épargne du mois : ${formatFCFA(check.value)}.`);
  }

  return (
    <Modal
      title="🐷 Épargne du mois"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          {current !== null && (
            <Button variant="secondary" onClick={() => void run(null, "Part d'épargne retirée.")}>
              Retirer
            </Button>
          )}
          <Button type="submit" form="formulaire-epargne-budget" block>
            Enregistrer
          </Button>
        </div>
      }
    >
      <form id="formulaire-epargne-budget" onSubmit={handleSubmit} noValidate className="space-y-4">
        <p className={`text-sm ${mutedText}`}>
          Ce montant est mis de côté dès le début du mois. Ce n'est pas une dépense : le reste du budget
          {check.ok ? ` (${formatFCFA(Math.max(0, totalBudget - check.value))})` : ''} est ce que vous pouvez dépenser.
        </p>
        <AmountInput
          id="epargne-budget"
          label="Montant à épargner chaque mois"
          value={value}
          onChange={setValue}
          error={submitted && !check.ok ? check.error : null}
        />
        <fieldset>
          <legend className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Part du budget du mois ({formatFCFA(totalBudget)})
          </legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {SAVINGS_PERCENT_CHOICES.map((p) => {
              const amount = shareOfTotal(totalBudget, p);
              const selected = check.ok && check.value === amount;
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setValue(String(amount))}
                  className={`min-h-11 rounded-full border-2 px-4 text-sm font-semibold ${
                    selected
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-100'
                      : 'border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  {p} %
                </button>
              );
            })}
          </div>
        </fieldset>
        {check.ok && check.value + allocated > totalBudget && (
          <p className="rounded-2xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            ⚠ Avec vos catégories ({formatFCFA(allocated)}), la répartition dépassera votre budget du mois de{' '}
            {formatFCFA(check.value + allocated - totalBudget)}.
          </p>
        )}
        {error && <FieldError>{error}</FieldError>}
      </form>
    </Modal>
  );
}

const PERCENT_CHOICES = [10, 15, 20, 25, 30, 40] as const;

interface BudgetEditorProps {
  category: Category;
  current: number | null;
  totalBudget: number | null;
  /** Montant déjà réparti sur les autres catégories. */
  allocatedOthers: number;
  onClose: () => void;
}

function BudgetEditor({ category, current, totalBudget, allocatedOthers, onClose }: BudgetEditorProps) {
  const { reload } = useAppData();
  const { showToast } = useToast();
  const [value, setValue] = useState(current === null ? '' : String(current));
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const check = validateAmount(value);
  const available = totalBudget !== null ? totalBudget - allocatedOthers : null;

  async function run(action: () => Promise<void>, message: string) {
    try {
      await action();
      await reload();
      showToast(message);
      onClose();
    } catch (err) {
      console.error(err);
      setError("L'enregistrement a échoué. Réessayez.");
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!check.ok) return;
    void run(() => setBudget(category.id, check.value), `Budget ${category.name} : ${formatFCFA(check.value)} par mois.`);
  }

  return (
    <Modal
      title={`Budget · ${category.icon} ${category.name}`}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          {current !== null && (
            <Button variant="secondary" onClick={() => void run(() => removeBudget(category.id), 'Budget supprimé.')}>
              Retirer
            </Button>
          )}
          <Button type="submit" form="formulaire-budget" block>
            Enregistrer
          </Button>
        </div>
      }
    >
      <form id="formulaire-budget" onSubmit={handleSubmit} noValidate className="space-y-4">
        {totalBudget !== null && available !== null && (
          <p
            className={`rounded-2xl px-3 py-2 text-sm font-medium ${
              available > 0
                ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100'
                : 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100'
            }`}
          >
            Budget du mois : {formatFCFA(totalBudget)} ·{' '}
            {available > 0 ? `disponible pour ${category.name} : ${formatFCFA(available)}` : 'tout est déjà réparti'}
          </p>
        )}

        <AmountInput
          id="plafond"
          label={`Montant prévu pour ${category.name} par mois`}
          value={value}
          onChange={setValue}
          error={submitted && !check.ok ? check.error : null}
        />

        {totalBudget !== null && (
          <fieldset>
            <legend className="text-sm font-semibold text-slate-800 dark:text-slate-200">Part du budget du mois</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {PERCENT_CHOICES.map((p) => {
                const amount = shareOfTotal(totalBudget, p);
                const selected = check.ok && check.value === amount;
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setValue(String(amount))}
                    className={`min-h-11 rounded-full border-2 px-4 text-sm font-semibold ${
                      selected
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-100'
                        : 'border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {p} %
                  </button>
                );
              })}
              {available !== null && available > 0 && (
                <button
                  type="button"
                  onClick={() => setValue(String(available))}
                  className="min-h-11 rounded-full border-2 border-dashed border-emerald-700 px-4 text-sm font-semibold text-emerald-800 dark:border-emerald-400 dark:text-emerald-300"
                >
                  Tout le reste ({formatFCFA(available)})
                </button>
              )}
            </div>
            {check.ok && (
              <p className={`mt-2 text-sm ${mutedText}`}>
                = {formatPercent((check.value / totalBudget) * 100)} de votre budget du mois
              </p>
            )}
            {check.ok && available !== null && check.value > available && (
              <p className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                ⚠ La répartition dépassera votre budget du mois de {formatFCFA(check.value - available)}.
              </p>
            )}
          </fieldset>
        )}
        {error && <FieldError>{error}</FieldError>}
      </form>
    </Modal>
  );
}
