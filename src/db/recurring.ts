import type { Expense, ISODate, RecurringExpense } from '../types';
import { monthKeyOf, todayISO } from '../utils/dates';
import { createId } from '../utils/id';
import { dueOccurrences } from '../utils/recurring';
import { getDB } from './database';

export async function saveRecurring(rule: RecurringExpense): Promise<void> {
  const db = await getDB();
  await db.put('recurring', rule);
}

export async function deleteRecurring(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('recurring', id);
}

/**
 * Crée les dépenses récurrentes arrivées à échéance.
 * La lecture des règles et l'écriture des dépenses se font dans la même transaction :
 * deux appels simultanés sont sérialisés par IndexedDB et ne créent pas de doublons.
 * Retourne le nombre de dépenses créées.
 */
export async function applyDueRecurring(today: ISODate = todayISO()): Promise<number> {
  const db = await getDB();
  const tx = db.transaction(['recurring', 'expenses', 'categories'], 'readwrite');
  const rules = await tx.objectStore('recurring').getAll();
  const categoryIds = new Set(await tx.objectStore('categories').getAllKeys());

  const writes: Promise<unknown>[] = [];
  let created = 0;
  for (const rule of rules) {
    if (!categoryIds.has(rule.categoryId)) continue;
    const dates = dueOccurrences(rule, today);
    const last = dates[dates.length - 1];
    if (!last) continue;
    for (const date of dates) {
      const expense: Expense = {
        id: createId(),
        amount: rule.amount,
        categoryId: rule.categoryId,
        date,
        paymentMethod: rule.paymentMethod,
        note: rule.note,
        createdAt: new Date().toISOString(),
        recurringId: rule.id,
      };
      if (rule.subcategoryId) expense.subcategoryId = rule.subcategoryId;
      writes.push(tx.objectStore('expenses').add(expense));
      created++;
    }
    writes.push(tx.objectStore('recurring').put({ ...rule, lastRunMonth: monthKeyOf(last) }));
  }
  await Promise.all([...writes, tx.done]);
  return created;
}
