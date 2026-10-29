import { useState, type FormEvent } from 'react';
import { applyDueAutoSavings, deleteGoal, saveGoal } from '../../db/savings';
import { useAppData } from '../../hooks/useAppData';
import { useToast } from '../../hooks/useToast';
import type { SavingsGoal } from '../../types';
import { currentMonthKey, formatShortDate, isValidMonthKey, todayISO } from '../../utils/dates';
import { createId } from '../../utils/id';
import { formatFCFA, validateAmount } from '../../utils/money';
import { initialLastRunMonth, nextOccurrence } from '../../utils/recurring';
import { balancesByGoal, GOAL_ICON_CHOICES, goalPlan, validateGoalName } from '../../utils/savings';
import { AmountInput } from '../AmountInput';
import { ConfirmDialog } from '../ConfirmDialog';
import { Modal } from '../Modal';
import { Button, FieldError, inputClass, labelClass, mutedText } from '../ui';
import { Chip } from './fields';

/** Valeurs de départ d'un nouvel objectif (ex. suggestion « Tabaski »). */
export interface GoalPreset {
  name: string;
  icon: string;
}

interface GoalEditorProps {
  goal: SavingsGoal | null;
  preset?: GoalPreset;
  onClose: () => void;
}

export function GoalEditor({ goal, preset, onClose }: GoalEditorProps) {
  const { goals, movements, reload } = useAppData();
  const { showToast } = useToast();
  const [name, setName] = useState(goal?.name ?? preset?.name ?? '');
  const [icon, setIcon] = useState(goal?.icon ?? preset?.icon ?? GOAL_ICON_CHOICES[0]);
  const [target, setTarget] = useState(goal?.target ? String(goal.target) : '');
  const [deadline, setDeadline] = useState(goal?.deadline ?? '');
  const [autoOn, setAutoOn] = useState(goal?.auto?.active ?? false);
  const [autoAmount, setAutoAmount] = useState(goal?.auto ? String(goal.auto.amount) : '');
  const [autoDay, setAutoDay] = useState(goal?.auto ? String(goal.auto.dayOfMonth) : '1');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const today = todayISO();
  const nameCheck = validateGoalName(name, goals, goal?.id);
  const targetCheck = target.trim() === '' ? null : validateAmount(target);
  const deadlineError = deadline === '' || isValidMonthKey(deadline) ? null : 'Choisissez un mois.';
  const autoCheck = validateAmount(autoAmount);
  const dayNumber = Number(autoDay);
  const dayError = /^\d{1,2}$/.test(autoDay) && dayNumber >= 1 && dayNumber <= 31 ? null : 'Indiquez un jour entre 1 et 31.';

  const balance = goal ? (balancesByGoal(movements).get(goal.id) ?? 0) : 0;
  const plan =
    targetCheck?.ok && deadline !== '' && deadlineError === null
      ? goalPlan({ target: targetCheck.value, deadline }, balance, today)
      : null;
  // On garde le mois déjà traité si le versement automatique tournait déjà : pas de doublon.
  const lastRunMonth =
    goal?.auto?.active && dayError === null && goal.auto.dayOfMonth === dayNumber
      ? goal.auto.lastRunMonth
      : initialLastRunMonth(dayError === null ? dayNumber : 1, today);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!nameCheck.ok || (targetCheck && !targetCheck.ok) || deadlineError) return;
    if (autoOn && (!autoCheck.ok || dayError)) return;
    const next: SavingsGoal = {
      id: goal?.id ?? createId(),
      name: nameCheck.value,
      icon,
      target: targetCheck?.ok ? targetCheck.value : null,
      deadline: deadline === '' ? null : deadline,
      createdAt: goal?.createdAt ?? new Date().toISOString(),
    };
    if (autoOn && autoCheck.ok) {
      next.auto = { amount: autoCheck.value, dayOfMonth: dayNumber, active: true, lastRunMonth };
    } else if (goal?.auto) {
      // Pause : on garde le réglage pour le réactiver plus tard.
      next.auto = { ...goal.auto, active: false };
    }
    try {
      await saveGoal(next);
      const created = await applyDueAutoSavings();
      await reload();
      showToast(`Objectif « ${next.name} » enregistré${created > 0 ? ` (versement de ${formatFCFA(next.auto?.amount ?? 0)} noté)` : ''}.`);
      onClose();
    } catch (err) {
      console.error(err);
      setError("L'enregistrement a échoué. Réessayez.");
    }
  }

  async function handleDelete() {
    if (!goal) return;
    await deleteGoal(goal.id);
    await reload();
    showToast(`Objectif « ${goal.name} » supprimé.`);
    onClose();
  }

  return (
    <>
      <Modal
        title={goal ? "Modifier l'objectif" : '🎯 Nouvel objectif'}
        onClose={onClose}
        footer={
          <div className="flex gap-2">
            {goal && (
              <Button variant="secondary" onClick={() => setConfirmDelete(true)}>
                Supprimer
              </Button>
            )}
            <Button type="submit" form="formulaire-objectif" block>
              Enregistrer
            </Button>
          </div>
        }
      >
        <form id="formulaire-objectif" onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-5">
          <div>
            <label htmlFor="nom-objectif" className={labelClass}>
              Nom de l'objectif
            </label>
            <input
              id="nom-objectif"
              type="text"
              maxLength={40}
              placeholder="Ex. : Tabaski, Fonds d'urgence, Téléphone…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${inputClass} mt-1`}
            />
            {submitted && !nameCheck.ok && <FieldError>{nameCheck.error}</FieldError>}
          </div>

          <fieldset>
            <legend className={labelClass}>Icône</legend>
            <div className="mt-1 grid grid-cols-8 gap-1">
              {GOAL_ICON_CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  aria-pressed={icon === choice}
                  aria-label={`Icône ${choice}`}
                  onClick={() => setIcon(choice)}
                  className={`flex h-11 items-center justify-center rounded-xl text-2xl ${
                    icon === choice ? 'bg-emerald-100 ring-2 ring-emerald-700 dark:bg-emerald-950 dark:ring-emerald-400' : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  {choice}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <AmountInput
              id="cible-objectif"
              label="Montant visé (facultatif)"
              value={target}
              onChange={setTarget}
              error={submitted && targetCheck && !targetCheck.ok ? targetCheck.error : null}
            />
            <p className={`mt-1 text-sm ${mutedText}`}>Laissez vide pour une épargne libre, sans montant précis.</p>
          </div>

          <div>
            <label htmlFor="echeance-objectif" className={labelClass}>
              Pour quand ? <span className="font-normal">(facultatif)</span>
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="echeance-objectif"
                type="month"
                min={currentMonthKey()}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className={`${inputClass} flex-1`}
              />
              {deadline !== '' && (
                <Button variant="secondary" onClick={() => setDeadline('')}>
                  Aucune
                </Button>
              )}
            </div>
            {submitted && deadlineError && <FieldError>{deadlineError}</FieldError>}
            {plan && plan.perMonth !== null && (
              <p className="mt-2 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                👉 Il faut mettre de côté environ {formatFCFA(plan.perMonth)} par mois.
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">🔁 Versement automatique</p>
                <p className={`text-sm ${mutedText}`}>Noté chaque mois, à l'ouverture de l'application.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoOn}
                aria-label="Versement automatique"
                onClick={() => {
                  if (!autoOn && autoAmount === '' && plan?.perMonth) setAutoAmount(String(plan.perMonth));
                  setAutoOn(!autoOn);
                }}
                className="flex h-11 w-14 shrink-0 items-center justify-center"
              >
                <span className={`relative h-7 w-12 rounded-full transition-colors ${autoOn ? 'bg-emerald-700 dark:bg-emerald-400' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all dark:bg-slate-950 ${autoOn ? 'left-6' : 'left-1'}`} />
                </span>
              </button>
            </div>
            {autoOn && (
              <div className="mt-3 space-y-3">
                <AmountInput
                  id="montant-auto"
                  label="Montant chaque mois"
                  value={autoAmount}
                  onChange={setAutoAmount}
                  error={submitted && !autoCheck.ok ? autoCheck.error : null}
                />
                {plan?.perMonth && !(autoCheck.ok && autoCheck.value === plan.perMonth) && (
                  <div className="-mt-1 flex">
                    <Chip selected={false} onClick={() => setAutoAmount(String(plan.perMonth))}>
                      Conseillé : {formatFCFA(plan.perMonth ?? 0)}
                    </Chip>
                  </div>
                )}
                <div>
                  <label htmlFor="jour-auto" className={labelClass}>
                    Jour du mois
                  </label>
                  <input
                    id="jour-auto"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    value={autoDay}
                    onChange={(e) => setAutoDay(e.target.value.trim())}
                    className={`${inputClass} mt-1 w-24`}
                  />
                  {submitted && dayError && <FieldError>{dayError}</FieldError>}
                  {dayError === null && (
                    <p className={`mt-1 text-sm ${mutedText}`}>
                      Prochain versement : {formatShortDate(nextOccurrence({ dayOfMonth: dayNumber, lastRunMonth }))}. Pensez à
                      mettre réellement l'argent de côté (Wave, banque…).
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          {error && <FieldError>{error}</FieldError>}
        </form>
      </Modal>
      {confirmDelete && goal && (
        <ConfirmDialog
          title={`Supprimer « ${goal.name} » ?`}
          message={
            balance > 0
              ? `Les ${formatFCFA(balance)} notés et tout l'historique de cet objectif seront effacés de l'application (votre argent réel n'est pas touché).`
              : "L'objectif et son historique seront effacés."
          }
          confirmLabel="Supprimer"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
