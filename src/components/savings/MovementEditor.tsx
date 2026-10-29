import { useState, type FormEvent } from 'react';
import { addMovement } from '../../db/savings';
import { useAppData } from '../../hooks/useAppData';
import { useToast } from '../../hooks/useToast';
import type { SavingsGoal } from '../../types';
import { isValidISODate, todayISO } from '../../utils/dates';
import { formatFCFA, validateAmount } from '../../utils/money';
import { goalPlan } from '../../utils/savings';
import { AmountInput } from '../AmountInput';
import { Modal } from '../Modal';
import { Button, FieldError, inputClass, labelClass, mutedText } from '../ui';
import { Chip, DateField } from './fields';

export type MovementKind = 'deposit' | 'withdraw';

interface MovementEditorProps {
  goal: SavingsGoal;
  kind: MovementKind;
  balance: number;
  onClose: () => void;
}

/** Note un versement (argent mis de côté) ou un retrait sur un objectif. */
export function MovementEditor({ goal, kind, balance, onClose }: MovementEditorProps) {
  const { reload } = useAppData();
  const { showToast } = useToast();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deposit = kind === 'deposit';
  const check = validateAmount(amount);
  const amountError = !check.ok
    ? check.error
    : !deposit && check.value > balance
      ? `Vous ne pouvez pas retirer plus que le solde (${formatFCFA(balance)}).`
      : null;
  const dateError = isValidISODate(date) ? null : 'Choisissez une date.';

  const plan = goalPlan(goal, balance, todayISO());
  const suggestions = deposit
    ? [...new Set([plan.perMonth, goal.auto?.amount, plan.remaining && plan.remaining <= 50000 ? plan.remaining : null, 5000, 10000, 25000])]
        .filter((v): v is number => typeof v === 'number' && v > 0)
        .slice(0, 5)
    : balance > 0
      ? [balance]
      : [];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!check.ok || amountError || dateError) return;
    try {
      await addMovement({ goalId: goal.id, amount: deposit ? check.value : -check.value, date, note: note.trim() });
      await reload();
      const reached = deposit && goal.target !== null && balance < goal.target && balance + check.value >= goal.target;
      showToast(
        reached
          ? `🎉 Bravo ! Objectif « ${goal.name} » atteint.`
          : `${deposit ? 'Versement' : 'Retrait'} de ${formatFCFA(check.value)} noté sur « ${goal.name} ».`,
      );
      onClose();
    } catch (err) {
      console.error(err);
      setError("L'enregistrement a échoué. Réessayez.");
    }
  }

  return (
    <Modal
      title={`${deposit ? 'Verser sur' : 'Retirer de'} ${goal.icon} ${goal.name}`}
      onClose={onClose}
      footer={
        <Button type="submit" form="formulaire-mouvement" block variant={deposit ? 'primary' : 'danger'}>
          {deposit ? 'Noter le versement' : 'Noter le retrait'}
        </Button>
      }
    >
      <form id="formulaire-mouvement" onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-5">
        <p className={`text-sm ${mutedText}`}>
          Solde actuel : <strong className="text-slate-900 dark:text-slate-100">{formatFCFA(balance)}</strong>
          {deposit && plan.perMonth !== null && ` · conseillé : ${formatFCFA(plan.perMonth)} ce mois-ci`}
        </p>
        <AmountInput
          id="montant-mouvement"
          label={deposit ? 'Montant mis de côté' : 'Montant retiré'}
          value={amount}
          onChange={setAmount}
          error={submitted ? amountError : null}
        />
        {suggestions.length > 0 && (
          <div className="-mt-3 flex flex-wrap gap-2">
            {suggestions.map((v) => (
              <Chip key={v} selected={check.ok && check.value === v} onClick={() => setAmount(String(v))}>
                {!deposit ? `Tout (${formatFCFA(v)})` : formatFCFA(v)}
              </Chip>
            ))}
          </div>
        )}
        <DateField id="date-mouvement" value={date} onChange={setDate} error={submitted ? dateError : null} />
        <div>
          <label htmlFor="note-mouvement" className={labelClass}>
            Note <span className="font-normal">(facultatif)</span>
          </label>
          <input
            id="note-mouvement"
            type="text"
            maxLength={200}
            placeholder={deposit ? 'Ex. : mis sur Wave, à la banque…' : 'Ex. : urgence santé'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </div>
        {error && <FieldError>{error}</FieldError>}
      </form>
    </Modal>
  );
}
