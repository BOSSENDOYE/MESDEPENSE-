import { useState } from 'react';
import { deleteMovement } from '../../db/savings';
import { useAppData } from '../../hooks/useAppData';
import { useToast } from '../../hooks/useToast';
import type { SavingsGoal, SavingsMovement } from '../../types';
import { formatDayHeading, formatShortDate, todayISO } from '../../utils/dates';
import { formatFCFA } from '../../utils/money';
import { goalPlan } from '../../utils/savings';
import { ConfirmDialog } from '../ConfirmDialog';
import { TrashIcon } from '../Icons';
import { Modal } from '../Modal';
import { Button, IconButton, mutedText } from '../ui';
import { GoalAdvice, GoalProgress } from './GoalCard';
import type { MovementKind } from './MovementEditor';

interface GoalDetailProps {
  goal: SavingsGoal;
  onClose: () => void;
  onMove: (kind: MovementKind) => void;
  onEdit: () => void;
}

/** Détail d'un objectif : solde, conseils et historique des versements/retraits. */
export function GoalDetail({ goal, onClose, onMove, onEdit }: GoalDetailProps) {
  const { movements, reload } = useAppData();
  const { showToast } = useToast();
  const [toDelete, setToDelete] = useState<SavingsMovement | null>(null);

  const history = movements
    .filter((m) => m.goalId === goal.id)
    .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
  const balance = history.reduce((sum, m) => sum + m.amount, 0);
  const plan = goalPlan(goal, balance, todayISO());

  async function handleDelete() {
    if (!toDelete) return;
    await deleteMovement(toDelete.id);
    await reload();
    showToast(`${toDelete.amount > 0 ? 'Versement' : 'Retrait'} supprimé.`);
    setToDelete(null);
  }

  return (
    <>
      <Modal
        title={`${goal.icon} ${goal.name}`}
        onClose={onClose}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => onMove('withdraw')} disabled={balance <= 0}>
              Retirer
            </Button>
            <Button block onClick={() => onMove('deposit')}>
              + Verser
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={`text-sm ${mutedText}`}>Épargné</p>
              <p className="text-3xl font-bold tabular-nums">{formatFCFA(balance)}</p>
              {goal.target !== null && <p className={`text-sm tabular-nums ${mutedText}`}>sur {formatFCFA(goal.target)}</p>}
            </div>
            <Button variant="ghost" onClick={onEdit}>
              Modifier
            </Button>
          </div>
          <GoalProgress goal={goal} plan={plan} />
          <GoalAdvice goal={goal} plan={plan} />

          <section aria-labelledby="historique-titre">
            <h3 id="historique-titre" className="mb-1 font-semibold">
              Historique
            </h3>
            {history.length === 0 ? (
              <p className={`text-sm ${mutedText}`}>Aucun versement pour l'instant. Touchez « + Verser » quand vous mettez de l'argent de côté.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-2">
                    <span aria-hidden="true" className="text-xl">
                      {m.amount > 0 ? (m.auto ? '🔁' : '⬆️') : '⬇️'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{m.amount > 0 ? 'Versement' : 'Retrait'}</p>
                      <p className={`truncate text-sm ${mutedText}`}>
                        {formatDayHeading(m.date)}
                        {m.note ? ` · ${m.note}` : ''}
                      </p>
                    </div>
                    <p
                      className={`shrink-0 font-semibold tabular-nums ${
                        m.amount > 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-700 dark:text-red-400'
                      }`}
                    >
                      {m.amount > 0 ? '+' : '−'}
                      {formatFCFA(Math.abs(m.amount))}
                    </p>
                    <IconButton label={`Supprimer ce ${m.amount > 0 ? 'versement' : 'retrait'}`} onClick={() => setToDelete(m)}>
                      <TrashIcon width={20} height={20} />
                    </IconButton>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </Modal>
      {toDelete && (
        <ConfirmDialog
          title={`Supprimer ce ${toDelete.amount > 0 ? 'versement' : 'retrait'} ?`}
          message={`${formatFCFA(Math.abs(toDelete.amount))} du ${formatShortDate(toDelete.date)} sera retiré de l'historique.`}
          confirmLabel="Supprimer"
          danger
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </>
  );
}
