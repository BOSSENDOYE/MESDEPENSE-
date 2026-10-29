import { useState, type FormEvent } from 'react';
import { applyDueRecurring, deleteRecurring, saveRecurring } from '../../db/recurring';
import { useAppData } from '../../hooks/useAppData';
import { useToast } from '../../hooks/useToast';
import type { PaymentMethod, RecurringExpense } from '../../types';
import { getLastPaymentMethod } from '../../utils/storage';
import { subcategoryName } from '../../utils/categories';
import { formatShortDate, todayISO } from '../../utils/dates';
import { createId } from '../../utils/id';
import { formatFCFA, validateAmount } from '../../utils/money';
import { initialLastRunMonth, nextOccurrence } from '../../utils/recurring';
import { pluralize } from '../../utils/text';
import { AmountInput } from '../AmountInput';
import { CategoryIcon } from '../CategoryIcon';
import { CategoryPicker } from '../CategoryPicker';
import { ConfirmDialog } from '../ConfirmDialog';
import { PlusIcon } from '../Icons';
import { Modal } from '../Modal';
import { PaymentMethodPicker } from '../PaymentMethodPicker';
import { TypeInput } from '../TypeInput';
import { ensureType } from '../../db/categories';
import { Button, Card, FieldError, inputClass, labelClass, mutedText } from '../ui';

type Editing = { mode: 'new' } | { mode: 'edit'; rule: RecurringExpense };

export function RecurringManager() {
  const { recurring, getCategory, reload } = useAppData();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<Editing | null>(null);

  async function toggle(rule: RecurringExpense) {
    const active = !rule.active;
    try {
      // À la réactivation, on repart d'aujourd'hui : pas de rattrapage des mois en pause.
      await saveRecurring({
        ...rule,
        active,
        lastRunMonth: active ? initialLastRunMonth(rule.dayOfMonth, todayISO()) : rule.lastRunMonth,
      });
      const created = active ? await applyDueRecurring() : 0;
      await reload();
      showToast(active ? `Récurrence réactivée${created > 0 ? ` (${pluralize(created, 'dépense créée', 'dépenses créées')})` : ''}.` : 'Récurrence mise en pause.');
    } catch (err) {
      console.error(err);
      showToast('La modification a échoué. Réessayez.', 'error');
    }
  }

  return (
    <Card>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Dépenses récurrentes</h2>
        <Button variant="ghost" onClick={() => setEditing({ mode: 'new' })}>
          <PlusIcon width={20} height={20} /> Ajouter
        </Button>
      </div>
      {recurring.length === 0 ? (
        <p className={`py-2 text-sm ${mutedText}`}>
          Loyer, abonnements, tontine… Ajoutez-les ici : la dépense sera créée automatiquement chaque mois, à l'ouverture de
          l'application.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {recurring.map((r) => {
            const category = getCategory(r.categoryId);
            return (
              <li key={r.id} className="flex items-center gap-2 py-2">
                <button
                  type="button"
                  onClick={() => setEditing({ mode: 'edit', rule: r })}
                  className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-2xl px-1 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label={`Modifier la dépense récurrente ${r.note || category.name}`}
                >
                  <CategoryIcon category={category} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {r.note || subcategoryName(category, r.subcategoryId) || category.name} ·{' '}
                      <span className="tabular-nums">{formatFCFA(r.amount)}</span>
                    </span>
                    <span className={`block truncate text-sm ${mutedText}`}>
                      Le {r.dayOfMonth} du mois ·{' '}
                      {r.active ? `prochaine : ${formatShortDate(nextOccurrence(r))}` : 'en pause'}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={r.active}
                  aria-label={`${r.note || category.name} active`}
                  onClick={() => void toggle(r)}
                  className="flex h-11 w-14 shrink-0 items-center justify-center"
                >
                  <span
                    className={`relative h-7 w-12 rounded-full transition-colors ${r.active ? 'bg-emerald-700 dark:bg-emerald-400' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all dark:bg-slate-950 ${r.active ? 'left-6' : 'left-1'}`}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {editing && <RecurringEditor rule={editing.mode === 'edit' ? editing.rule : null} onClose={() => setEditing(null)} />}
    </Card>
  );
}

function RecurringEditor({ rule, onClose }: { rule: RecurringExpense | null; onClose: () => void }) {
  const { categories, reload } = useAppData();
  const { showToast } = useToast();
  const [amount, setAmount] = useState(rule ? String(rule.amount) : '');
  const [categoryId, setCategoryId] = useState(rule?.categoryId ?? '');
  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null;
  const [typeName, setTypeName] = useState(() => {
    const category = categories.find((c) => c.id === rule?.categoryId);
    return (category && subcategoryName(category, rule?.subcategoryId)) ?? '';
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(rule?.paymentMethod ?? getLastPaymentMethod());
  const [note, setNote] = useState(rule?.note ?? '');
  const [day, setDay] = useState(rule ? String(rule.dayOfMonth) : '1');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const amountCheck = validateAmount(amount);
  const categoryError = categories.some((c) => c.id === categoryId) ? null : 'Choisissez une catégorie.';
  const dayNumber = Number(day);
  const dayError = /^\d{1,2}$/.test(day) && dayNumber >= 1 && dayNumber <= 31 ? null : 'Indiquez un jour entre 1 et 31.';

  const today = todayISO();
  const preview =
    dayError === null
      ? nextOccurrence({
          dayOfMonth: dayNumber,
          lastRunMonth: rule && rule.active ? rule.lastRunMonth : initialLastRunMonth(dayNumber, today),
        })
      : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!amountCheck.ok || categoryError || dayError) return;
    try {
      const next: RecurringExpense = {
        id: rule?.id ?? createId(),
        amount: amountCheck.value,
        categoryId,
        subcategoryId: await ensureType(categoryId, typeName),
        paymentMethod,
        note: note.trim(),
        dayOfMonth: dayNumber,
        active: rule?.active ?? true,
        lastRunMonth: rule && rule.active ? rule.lastRunMonth : initialLastRunMonth(dayNumber, today),
      };
      await saveRecurring(next);
      const created = await applyDueRecurring();
      await reload();
      showToast(
        `Dépense récurrente enregistrée${created > 0 ? ` (${pluralize(created, 'dépense créée', 'dépenses créées')} aujourd'hui)` : ''}.`,
      );
      onClose();
    } catch (err) {
      console.error(err);
      setError("L'enregistrement a échoué. Réessayez.");
    }
  }

  async function handleDelete() {
    if (!rule) return;
    await deleteRecurring(rule.id);
    await reload();
    showToast('Dépense récurrente supprimée. Les dépenses déjà créées sont conservées.');
    onClose();
  }

  return (
    <>
      <Modal
        title={rule ? 'Modifier la récurrence' : 'Nouvelle dépense récurrente'}
        onClose={onClose}
        footer={
          <div className="flex gap-2">
            {rule && (
              <Button variant="secondary" onClick={() => setConfirmDelete(true)}>
                Supprimer
              </Button>
            )}
            <Button type="submit" form="formulaire-recurrence" block>
              Enregistrer
            </Button>
          </div>
        }
      >
        <form id="formulaire-recurrence" onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-5">
          <AmountInput
            id="montant-recurrent"
            label="Montant"
            value={amount}
            onChange={setAmount}
            error={submitted && !amountCheck.ok ? amountCheck.error : null}
          />
          <CategoryPicker
            categories={categories}
            value={categoryId}
            onChange={(id) => {
              if (id !== categoryId) setTypeName('');
              setCategoryId(id);
            }}
            error={submitted ? categoryError : null}
          />
          {selectedCategory && (
            <TypeInput id="type-recurrent" category={selectedCategory} value={typeName} onChange={setTypeName} />
          )}
          <div>
            <label htmlFor="jour" className={labelClass}>
              Jour du mois
            </label>
            <input
              id="jour"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              value={day}
              onChange={(e) => setDay(e.target.value.trim())}
              className={`${inputClass} mt-1 w-24`}
              aria-describedby="jour-aide"
            />
            <p id="jour-aide" className={`mt-1 text-sm ${mutedText}`}>
              Si le mois est plus court (ex. le 31), le dernier jour du mois est utilisé.
              {preview && ` Prochaine création : ${formatShortDate(preview)}.`}
            </p>
            {submitted && dayError && <FieldError>{dayError}</FieldError>}
          </div>
          <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />
          <div>
            <label htmlFor="note-recurrente" className={labelClass}>
              Note <span className="font-normal">(facultatif)</span>
            </label>
            <input
              id="note-recurrente"
              type="text"
              maxLength={200}
              placeholder="Ex. : Loyer, Canal+, Woyofal…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={`${inputClass} mt-1`}
            />
          </div>
          {error && <FieldError>{error}</FieldError>}
        </form>
      </Modal>

      {confirmDelete && rule && (
        <ConfirmDialog
          title="Supprimer cette récurrence ?"
          message="Plus aucune dépense ne sera créée automatiquement. Les dépenses déjà créées sont conservées."
          confirmLabel="Supprimer"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
