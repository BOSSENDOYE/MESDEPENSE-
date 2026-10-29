import { useState, type FormEvent } from 'react';
import { addIncome, deleteIncome, updateIncome } from '../../db/savings';
import { useAppData } from '../../hooks/useAppData';
import { useToast } from '../../hooks/useToast';
import type { Income } from '../../types';
import { isValidISODate, todayISO } from '../../utils/dates';
import { formatFCFA, validateAmount } from '../../utils/money';
import { INCOME_SOURCE_CHOICES } from '../../utils/savings';
import { AmountInput } from '../AmountInput';
import { ConfirmDialog } from '../ConfirmDialog';
import { Modal } from '../Modal';
import { Button, FieldError, inputClass, labelClass } from '../ui';
import { Chip, DateField } from './fields';

/** Ajout ou modification d'un revenu (salaire, vente, transfert reçu…). */
export function IncomeEditor({ income, onClose }: { income: Income | null; onClose: () => void }) {
  const { incomes, reload } = useAppData();
  const { showToast } = useToast();
  const [amount, setAmount] = useState(income ? String(income.amount) : '');
  const [source, setSource] = useState(income?.source ?? '');
  const [date, setDate] = useState(income?.date ?? todayISO());
  const [note, setNote] = useState(income?.note ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const amountCheck = validateAmount(amount);
  const dateError = isValidISODate(date) ? null : 'Choisissez une date.';
  // Sources déjà utilisées en tête, puis les suggestions.
  const suggestions = [...new Set([...incomes.map((i) => i.source), ...INCOME_SOURCE_CHOICES])].slice(0, 8);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!amountCheck.ok || dateError) return;
    const fields = { amount: amountCheck.value, date, source: source.trim() || 'Revenu', note: note.trim() };
    try {
      if (income) await updateIncome({ ...income, ...fields });
      else await addIncome(fields);
      await reload();
      showToast(`${income ? 'Revenu modifié' : 'Revenu ajouté'} : ${formatFCFA(fields.amount)}.`);
      onClose();
    } catch (err) {
      console.error(err);
      setError("L'enregistrement a échoué. Réessayez.");
    }
  }

  async function handleDelete() {
    if (!income) return;
    await deleteIncome(income.id);
    await reload();
    showToast('Revenu supprimé.');
    onClose();
  }

  return (
    <>
      <Modal
        title={income ? 'Modifier le revenu' : '💵 Nouveau revenu'}
        onClose={onClose}
        footer={
          <div className="flex gap-2">
            {income && (
              <Button variant="secondary" onClick={() => setConfirmDelete(true)}>
                Supprimer
              </Button>
            )}
            <Button type="submit" form="formulaire-revenu" block>
              Enregistrer
            </Button>
          </div>
        }
      >
        <form id="formulaire-revenu" onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-5">
          <AmountInput
            id="montant-revenu"
            label="Montant reçu"
            value={amount}
            onChange={setAmount}
            error={submitted && !amountCheck.ok ? amountCheck.error : null}
          />
          <div>
            <label htmlFor="source-revenu" className={labelClass}>
              D'où vient cet argent ?
            </label>
            <input
              id="source-revenu"
              type="text"
              maxLength={40}
              placeholder="Ex. : Salaire, Commerce…"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className={`${inputClass} mt-1`}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <Chip key={s} selected={source.trim() === s} onClick={() => setSource(s)}>
                  {s}
                </Chip>
              ))}
            </div>
          </div>
          <DateField id="date-revenu" value={date} onChange={setDate} error={submitted ? dateError : null} />
          <div>
            <label htmlFor="note-revenu" className={labelClass}>
              Note <span className="font-normal">(facultatif)</span>
            </label>
            <input
              id="note-revenu"
              type="text"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={`${inputClass} mt-1`}
            />
          </div>
          {error && <FieldError>{error}</FieldError>}
        </form>
      </Modal>
      {confirmDelete && (
        <ConfirmDialog
          title="Supprimer ce revenu ?"
          message="Il ne sera plus compté dans votre bilan du mois."
          confirmLabel="Supprimer"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
