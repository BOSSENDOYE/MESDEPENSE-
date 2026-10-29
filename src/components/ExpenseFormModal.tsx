import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ensureType } from '../db/categories';
import { addExpense, deleteExpense, updateExpense } from '../db/expenses';
import { useAppData } from '../hooks/useAppData';
import { useToast } from '../hooks/useToast';
import type { Category, Expense, ExpenseInput } from '../types';
import { subcategoryName } from '../utils/categories';
import { isValidISODate, todayISO, yesterdayISO } from '../utils/dates';
import { formatFCFA, validateAmount } from '../utils/money';
import {
  clearDraft,
  editDraftKey,
  getLastPaymentMethod,
  isDraftMeaningful,
  loadDraft,
  NEW_EXPENSE_DRAFT,
  saveDraft,
  setLastPaymentMethod,
  type ExpenseDraft,
} from '../utils/storage';
import { AmountInput } from './AmountInput';
import { CategoryPicker } from './CategoryPicker';
import { ConfirmDialog } from './ConfirmDialog';
import { Modal } from './Modal';
import { PaymentMethodPicker } from './PaymentMethodPicker';
import { TypeInput } from './TypeInput';
import { Button, FieldError, inputClass, labelClass } from './ui';

const FORM_ID = 'formulaire-depense';

function emptyDraft(): ExpenseDraft {
  return {
    amount: '',
    categoryId: '',
    typeName: '',
    date: todayISO(),
    paymentMethod: getLastPaymentMethod(),
    note: '',
  };
}

function draftFromExpense(e: Expense, categories: readonly Category[]): ExpenseDraft {
  const category = categories.find((c) => c.id === e.categoryId);
  return {
    amount: String(e.amount),
    categoryId: e.categoryId,
    typeName: (category && subcategoryName(category, e.subcategoryId)) ?? '',
    date: e.date,
    paymentMethod: e.paymentMethod,
    note: e.note,
  };
}

interface ExpenseFormModalProps {
  /** null = nouvelle dépense */
  expense: Expense | null;
  onClose: () => void;
}

export function ExpenseFormModal({ expense, onClose }: ExpenseFormModalProps) {
  const { categories, reload } = useAppData();
  const { showToast } = useToast();
  const draftKey = expense ? editDraftKey(expense.id) : NEW_EXPENSE_DRAFT;

  const [initial] = useState(() => {
    const saved = loadDraft(draftKey);
    if (saved && isDraftMeaningful(saved)) return { draft: saved, restored: true };
    return { draft: expense ? draftFromExpense(expense, categories) : emptyDraft(), restored: false };
  });
  const [draft, setDraft] = useState<ExpenseDraft>(initial.draft);
  const [restored, setRestored] = useState(initial.restored);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  // Sauvegarde du brouillon à chaque modification : rien n'est perdu si l'app est fermée.
  useEffect(() => {
    if (isDraftMeaningful(draft)) saveDraft(draftKey, draft);
    else clearDraft(draftKey);
  }, [draftKey, draft]);

  useEffect(() => {
    if (!expense) amountRef.current?.focus();
  }, [expense]);

  function update<K extends keyof ExpenseDraft>(field: K, value: ExpenseDraft[K]) {
    setDraft((d) => ({ ...d, [field]: value }));
  }

  const selectedCategory = categories.find((c) => c.id === draft.categoryId) ?? null;
  const amountCheck = validateAmount(draft.amount);
  const categoryError =
    draft.categoryId === ''
      ? 'Choisissez une catégorie.'
      : categories.some((c) => c.id === draft.categoryId)
        ? null
        : "Cette catégorie n'existe plus : choisissez-en une autre.";
  const dateError = isValidISODate(draft.date) ? null : 'Choisissez une date valide.';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!amountCheck.ok) {
      amountRef.current?.focus();
      return;
    }
    if (categoryError || dateError) return;

    setSaving(true);
    setSaveError(null);
    try {
      // Le type écrit est réutilisé s'il existe déjà, sinon ajouté à la catégorie.
      const subcategoryId = await ensureType(draft.categoryId, draft.typeName);
      const input: ExpenseInput = {
        amount: amountCheck.value,
        categoryId: draft.categoryId,
        // Toujours présent (même undefined) pour effacer l'ancien type lors d'une modification.
        subcategoryId,
        date: draft.date,
        paymentMethod: draft.paymentMethod,
        note: draft.note.trim(),
      };
      if (expense) await updateExpense({ ...expense, ...input });
      else await addExpense(input);
      clearDraft(draftKey);
      setLastPaymentMethod(input.paymentMethod);
      await reload();
      showToast(expense ? 'Dépense modifiée.' : `Dépense de ${formatFCFA(input.amount)} enregistrée.`);
      onClose();
    } catch (err) {
      console.error(err);
      setSaveError("L'enregistrement a échoué. Votre saisie est conservée : réessayez.");
      setSaving(false);
    }
  }

  function handleClose() {
    // Une nouvelle saisie interrompue reste en brouillon ; une modification abandonnée est annulée.
    if (expense) clearDraft(draftKey);
    onClose();
  }

  function handleReset() {
    clearDraft(draftKey);
    setDraft(expense ? draftFromExpense(expense, categories) : emptyDraft());
    setRestored(false);
    setSubmitted(false);
    amountRef.current?.focus();
  }

  async function handleDelete() {
    if (!expense) return;
    await deleteExpense(expense.id);
    clearDraft(draftKey);
    await reload();
    showToast('Dépense supprimée.');
    onClose();
  }

  const today = todayISO();
  const yesterday = yesterdayISO();

  return (
    <>
      <Modal
        title={expense ? 'Modifier la dépense' : 'Nouvelle dépense'}
        onClose={handleClose}
        footer={
          <div className="flex gap-2">
            {expense && (
              <Button variant="secondary" onClick={() => setConfirmDelete(true)} disabled={saving}>
                Supprimer
              </Button>
            )}
            <Button type="submit" form={FORM_ID} block disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        }
      >
        <form id={FORM_ID} onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-5">
          {restored && (
            <div className="flex items-center justify-between gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              <span>Saisie non terminée restaurée.</span>
              <button type="button" onClick={handleReset} className="min-h-11 px-2 font-semibold underline">
                Effacer
              </button>
            </div>
          )}

          <AmountInput
            id="montant"
            label="Montant"
            value={draft.amount}
            onChange={(v) => update('amount', v)}
            error={submitted && !amountCheck.ok ? amountCheck.error : null}
            inputRef={amountRef}
          />

          <CategoryPicker
            categories={categories}
            value={draft.categoryId}
            onChange={(id) =>
              setDraft((d) => (d.categoryId === id ? d : { ...d, categoryId: id, typeName: '' }))
            }
            error={submitted ? categoryError : null}
          />

          {selectedCategory && (
            <TypeInput
              id="type-depense"
              category={selectedCategory}
              value={draft.typeName}
              onChange={(text) => update('typeName', text)}
            />
          )}

          <div>
            <label htmlFor="date" className={labelClass}>
              Date
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="date"
                type="date"
                required
                value={draft.date}
                onChange={(e) => update('date', e.target.value)}
                className={`${inputClass} flex-1`}
              />
              <Button
                variant={draft.date === today ? 'primary' : 'secondary'}
                onClick={() => update('date', today)}
                aria-pressed={draft.date === today}
                className="text-sm"
              >
                Aujourd'hui
              </Button>
              <Button
                variant={draft.date === yesterday ? 'primary' : 'secondary'}
                onClick={() => update('date', yesterday)}
                aria-pressed={draft.date === yesterday}
                className="text-sm"
              >
                Hier
              </Button>
            </div>
            {submitted && dateError && <FieldError>{dateError}</FieldError>}
          </div>

          <PaymentMethodPicker value={draft.paymentMethod} onChange={(m) => update('paymentMethod', m)} />

          <div>
            <label htmlFor="note" className={labelClass}>
              Note <span className="font-normal">(facultatif)</span>
            </label>
            <input
              id="note"
              type="text"
              maxLength={200}
              enterKeyHint="done"
              placeholder="Ex. : courses au marché Sandaga"
              value={draft.note}
              onChange={(e) => update('note', e.target.value)}
              className={`${inputClass} mt-1`}
            />
          </div>

          {saveError && <FieldError>{saveError}</FieldError>}
        </form>
      </Modal>

      {confirmDelete && expense && (
        <ConfirmDialog
          title="Supprimer cette dépense ?"
          message={`La dépense de ${formatFCFA(expense.amount)} sera définitivement supprimée.`}
          confirmLabel="Supprimer"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
