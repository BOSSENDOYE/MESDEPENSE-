import { useMemo, useState, type FormEvent } from 'react';
import { AmountInput } from '../components/AmountInput';
import { BudgetBar } from '../components/BudgetBar';
import { CategoryIcon } from '../components/CategoryIcon';
import { Modal } from '../components/Modal';
import { MonthSwitcher } from '../components/MonthSwitcher';
import { Button, Card, FieldError, PageHeader, mutedText } from '../components/ui';
import { removeBudget, setBudget } from '../db/budgets';
import { useAppData } from '../hooks/useAppData';
import { useToast } from '../hooks/useToast';
import type { Category } from '../types';
import { currentMonthKey } from '../utils/dates';
import { formatFCFA, validateAmount } from '../utils/money';
import { expensesInMonth, sumAmounts, totalsByCategory } from '../utils/stats';

export function BudgetsPage() {
  const { expenses, categories, budgets } = useAppData();
  const [month, setMonth] = useState(currentMonthKey);
  const [editing, setEditing] = useState<Category | null>(null);

  const limits = useMemo(() => new Map(budgets.map((b) => [b.categoryId, b.monthlyLimit])), [budgets]);
  const spentByCategory = useMemo(() => totalsByCategory(expensesInMonth(expenses, month)), [expenses, month]);

  const budgeted = categories.filter((c) => limits.has(c.id));
  const unbudgeted = categories.filter((c) => !limits.has(c.id));
  const totalLimit = budgeted.reduce((sum, c) => sum + (limits.get(c.id) ?? 0), 0);
  const totalSpent = sumAmounts(budgeted.map((c) => ({ amount: spentByCategory.get(c.id) ?? 0 })));

  return (
    <div className="space-y-4">
      <PageHeader title="Budgets" />
      <MonthSwitcher month={month} onChange={setMonth} />

      {budgeted.length === 0 ? (
        <Card>
          <h2 className="text-lg font-semibold">Aucun budget défini</h2>
          <p className={`mt-1 text-sm ${mutedText}`}>
            Fixez un plafond mensuel pour une catégorie : une alerte s'affiche à 80 % puis à 100 %.
          </p>
        </Card>
      ) : (
        <Card>
          <h2 className={`text-sm font-medium ${mutedText}`}>Total des catégories budgétées</h2>
          <p className="mb-2 mt-1 text-2xl font-bold tabular-nums">
            {formatFCFA(totalSpent)} <span className={`text-base font-normal ${mutedText}`}>/ {formatFCFA(totalLimit)}</span>
          </p>
          <BudgetBar spent={totalSpent} limit={totalLimit} label="Budget total" />
        </Card>
      )}

      {budgeted.length > 0 && (
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
                      </p>
                    </div>
                    <Button variant="ghost" onClick={() => setEditing(c)} aria-label={`Modifier le budget ${c.name}`}>
                      Modifier
                    </Button>
                  </div>
                  <BudgetBar spent={spent} limit={limit} label={`Budget ${c.name}`} />
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {unbudgeted.length > 0 && (
        <Card>
          <h2 className="mb-2 text-lg font-semibold">Sans budget</h2>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {unbudgeted.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2">
                <CategoryIcon category={c} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className={`text-sm tabular-nums ${mutedText}`}>{formatFCFA(spentByCategory.get(c.id) ?? 0)} ce mois</p>
                </div>
                <Button variant="ghost" onClick={() => setEditing(c)} aria-label={`Définir un budget pour ${c.name}`}>
                  Définir
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {editing && <BudgetEditor category={editing} current={limits.get(editing.id) ?? null} onClose={() => setEditing(null)} />}
    </div>
  );
}

function BudgetEditor({ category, current, onClose }: { category: Category; current: number | null; onClose: () => void }) {
  const { reload } = useAppData();
  const { showToast } = useToast();
  const [value, setValue] = useState(current === null ? '' : String(current));
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const check = validateAmount(value);

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
      title={`Budget · ${category.name}`}
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
      <form id="formulaire-budget" onSubmit={handleSubmit} noValidate>
        <AmountInput
          id="plafond"
          label="Plafond mensuel"
          value={value}
          onChange={setValue}
          error={submitted && !check.ok ? check.error : null}
        />
        {error && <FieldError>{error}</FieldError>}
      </form>
    </Modal>
  );
}
