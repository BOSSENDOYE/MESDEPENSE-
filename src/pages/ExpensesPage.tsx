import { useMemo, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { ExpenseRow } from '../components/ExpenseRow';
import { SearchIcon } from '../components/Icons';
import { Button, PageHeader, inputClass, mutedText } from '../components/ui';
import { deleteExpense } from '../db/expenses';
import { useAppData } from '../hooks/useAppData';
import { useToast } from '../hooks/useToast';
import type { Expense, MonthKey } from '../types';
import { subcategoryName } from '../utils/categories';
import { currentMonthKey, formatDayHeading, formatMonthLabel } from '../utils/dates';
import { formatFCFA } from '../utils/money';
import { availableMonths, filterExpenses, groupByDay, sumAmounts } from '../utils/stats';
import { pluralize } from '../utils/text';

const ALL = '';

export function ExpensesPage({ onAdd, onEdit }: { onAdd: () => void; onEdit: (expense: Expense) => void }) {
  const { expenses, categories, getCategory, reload } = useAppData();
  const { showToast } = useToast();
  const [month, setMonth] = useState<MonthKey | typeof ALL>(currentMonthKey);
  const [categoryId, setCategoryId] = useState<string>(ALL);
  const [subcategoryId, setSubcategoryId] = useState<string>(ALL);
  const [query, setQuery] = useState('');
  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null;
  const [toDelete, setToDelete] = useState<Expense | null>(null);

  const months = useMemo(() => availableMonths(expenses, currentMonthKey()), [expenses]);
  const filtered = useMemo(
    () =>
      filterExpenses(
        expenses,
        {
          month: month === ALL ? null : month,
          categoryId: categoryId === ALL ? null : categoryId,
          subcategoryId: subcategoryId === ALL ? null : subcategoryId,
          query,
        },
        // La recherche trouve aussi le type (ex. « taxi ») et la catégorie.
        (e) => {
          const category = getCategory(e.categoryId);
          return `${category.name} ${subcategoryName(category, e.subcategoryId) ?? ''}`;
        },
      ),
    [expenses, month, categoryId, subcategoryId, query, getCategory],
  );
  const groups = useMemo(() => groupByDay(filtered), [filtered]);
  const hasFilters = categoryId !== ALL || query.trim() !== '';

  function resetFilters() {
    setCategoryId(ALL);
    setSubcategoryId(ALL);
    setQuery('');
    setMonth(ALL);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    await deleteExpense(toDelete.id);
    await reload();
    setToDelete(null);
    showToast('Dépense supprimée.');
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Dépenses" />

      <div className="space-y-2">
        <div className="relative">
          <label htmlFor="recherche" className="sr-only">
            Rechercher dans les notes et les types
          </label>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" width={20} height={20} />
          <input
            id="recherche"
            type="search"
            placeholder="Rechercher (note, type : taxi, loyer…)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`${inputClass} pl-10`}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="filtre-mois" className="sr-only">
              Mois
            </label>
            <select id="filtre-mois" value={month} onChange={(e) => setMonth(e.target.value)} className={inputClass}>
              <option value={ALL}>Tous les mois</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filtre-categorie" className="sr-only">
              Catégorie
            </label>
            <select
              id="filtre-categorie"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setSubcategoryId(ALL);
              }}
              className={inputClass}
            >
              <option value={ALL}>Toutes catégories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {selectedCategory && selectedCategory.subcategories.length > 0 && (
          <div>
            <label htmlFor="filtre-type" className="sr-only">
              Type de {selectedCategory.name}
            </label>
            <select id="filtre-type" value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} className={inputClass}>
              <option value={ALL}>Tous les types de {selectedCategory.name}</option>
              {selectedCategory.subcategories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {expenses.length === 0 ? (
        <EmptyState icon="🧾" title="Aucune dépense enregistrée" action={<Button onClick={onAdd}>Ajouter une dépense</Button>}>
          Vos dépenses apparaîtront ici, regroupées par jour.
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🔎"
          title="Aucun résultat"
          action={
            <Button variant="secondary" onClick={resetFilters}>
              Réinitialiser les filtres
            </Button>
          }
        >
          {hasFilters
            ? 'Aucune dépense ne correspond à ces filtres.'
            : `Aucune dépense en ${month === ALL ? 'tout' : formatMonthLabel(month).toLowerCase()}.`}
        </EmptyState>
      ) : (
        <>
          <p className={`text-sm ${mutedText}`} aria-live="polite">
            {pluralize(filtered.length, 'dépense', 'dépenses')} · <strong className="text-slate-900 dark:text-slate-100">{formatFCFA(sumAmounts(filtered))}</strong>
          </p>
          <div className="space-y-4">
            {groups.map((g) => (
              <section key={g.date} aria-label={formatDayHeading(g.date)}>
                <h2 className="sticky top-0 z-10 flex items-center justify-between bg-slate-50/95 px-2 py-2 text-sm font-semibold backdrop-blur dark:bg-slate-950/95">
                  <span>{formatDayHeading(g.date)}</span>
                  <span className="tabular-nums">{formatFCFA(g.total)}</span>
                </h2>
                <ul className="rounded-3xl bg-white p-1 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                  {g.expenses.map((e) => (
                    <ExpenseRow key={e.id} expense={e} category={getCategory(e.categoryId)} onEdit={onEdit} onDelete={setToDelete} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Supprimer cette dépense ?"
          message={`${getCategory(toDelete.categoryId).name} · ${formatFCFA(toDelete.amount)}${toDelete.note ? ` · « ${toDelete.note} »` : ''}. Cette action est définitive.`}
          confirmLabel="Supprimer"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
