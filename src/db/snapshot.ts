import type { AppDataSnapshot } from '../types';
import { getDB } from './database';

const STORES = ['expenses', 'categories', 'budgets', 'recurring', 'settings', 'goals', 'movements', 'incomes'] as const;

export async function readAllData(): Promise<AppDataSnapshot> {
  const db = await getDB();
  const tx = db.transaction(STORES, 'readonly');
  const [expenses, categories, budgets, recurring, totalBudget, savingsBudget, goals, movements, incomes] = await Promise.all([
    tx.objectStore('expenses').getAll(),
    tx.objectStore('categories').getAll(),
    tx.objectStore('budgets').getAll(),
    tx.objectStore('recurring').getAll(),
    tx.objectStore('settings').get('totalBudget'),
    tx.objectStore('settings').get('savingsBudget'),
    tx.objectStore('goals').getAll(),
    tx.objectStore('movements').getAll(),
    tx.objectStore('incomes').getAll(),
    tx.done,
  ]);
  return {
    expenses,
    categories: categories.map((c) => (Array.isArray(c.subcategories) ? c : { ...c, subcategories: [] })),
    budgets,
    recurring,
    totalBudget: totalBudget?.value ?? null,
    savingsBudget: savingsBudget?.value ?? null,
    goals,
    movements,
    incomes,
  };
}

/** Remplace toutes les données (restauration d'une sauvegarde), de façon atomique. */
export async function replaceAllData(data: AppDataSnapshot): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORES, 'readwrite');
  const stores = {
    expenses: tx.objectStore('expenses'),
    categories: tx.objectStore('categories'),
    budgets: tx.objectStore('budgets'),
    recurring: tx.objectStore('recurring'),
    settings: tx.objectStore('settings'),
    goals: tx.objectStore('goals'),
    movements: tx.objectStore('movements'),
    incomes: tx.objectStore('incomes'),
  };
  await Promise.all(STORES.map((name) => stores[name].clear()));
  await Promise.all([
    ...data.categories.map((c) => stores.categories.put(c)),
    ...data.expenses.map((e) => stores.expenses.put(e)),
    ...data.budgets.map((b) => stores.budgets.put(b)),
    ...data.recurring.map((r) => stores.recurring.put(r)),
    ...data.goals.map((g) => stores.goals.put(g)),
    ...data.movements.map((m) => stores.movements.put(m)),
    ...data.incomes.map((i) => stores.incomes.put(i)),
    ...(data.totalBudget !== null ? [stores.settings.put({ key: 'totalBudget', value: data.totalBudget })] : []),
    ...(data.savingsBudget !== null ? [stores.settings.put({ key: 'savingsBudget', value: data.savingsBudget })] : []),
    tx.done,
  ]);
}

/** Demande au navigateur de ne pas effacer les données en cas de manque d'espace. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!('storage' in navigator) || typeof navigator.storage.persist !== 'function') return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
