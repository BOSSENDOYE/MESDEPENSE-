import type { Income, IncomeInput, ISODate, SavingsGoal, SavingsMovement, SavingsMovementInput } from '../types';
import { monthKeyOf, todayISO } from '../utils/dates';
import { createId } from '../utils/id';
import { dueOccurrences } from '../utils/recurring';
import { getDB } from './database';

export async function saveGoal(goal: SavingsGoal): Promise<void> {
  const db = await getDB();
  await db.put('goals', goal);
}

/** Supprime l'objectif et tout son historique de versements, dans une seule transaction. */
export async function deleteGoal(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['goals', 'movements'], 'readwrite');
  const keys = await tx.objectStore('movements').index('by-goal').getAllKeys(id);
  await Promise.all([...keys.map((k) => tx.objectStore('movements').delete(k)), tx.objectStore('goals').delete(id), tx.done]);
}

export async function addMovement(input: SavingsMovementInput): Promise<SavingsMovement> {
  const db = await getDB();
  const movement: SavingsMovement = { ...input, id: createId(), createdAt: new Date().toISOString() };
  await db.add('movements', movement);
  return movement;
}

export async function deleteMovement(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('movements', id);
}

export async function addIncome(input: IncomeInput): Promise<Income> {
  const db = await getDB();
  const income: Income = { ...input, id: createId(), createdAt: new Date().toISOString() };
  await db.add('incomes', income);
  return income;
}

export async function updateIncome(income: Income): Promise<void> {
  const db = await getDB();
  await db.put('incomes', income);
}

export async function deleteIncome(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('incomes', id);
}

/**
 * Note les versements automatiques arrivés à échéance (même principe que les dépenses récurrentes :
 * lecture et écriture dans la même transaction, donc pas de doublon). Retourne le nombre créé.
 */
export async function applyDueAutoSavings(today: ISODate = todayISO()): Promise<number> {
  const db = await getDB();
  const tx = db.transaction(['goals', 'movements'], 'readwrite');
  const goals = await tx.objectStore('goals').getAll();

  const writes: Promise<unknown>[] = [];
  let created = 0;
  for (const goal of goals) {
    if (!goal.auto) continue;
    const dates = dueOccurrences(goal.auto, today);
    const last = dates[dates.length - 1];
    if (!last) continue;
    for (const date of dates) {
      const movement: SavingsMovement = {
        id: createId(),
        goalId: goal.id,
        amount: goal.auto.amount,
        date,
        note: 'Versement automatique',
        createdAt: new Date().toISOString(),
        auto: true,
      };
      writes.push(tx.objectStore('movements').add(movement));
      created++;
    }
    writes.push(tx.objectStore('goals').put({ ...goal, auto: { ...goal.auto, lastRunMonth: monthKeyOf(last) } }));
  }
  await Promise.all([...writes, tx.done]);
  return created;
}
