import type { AppDataSnapshot } from '../types';
import { getDB } from './database';

export async function readAllData(): Promise<AppDataSnapshot> {
  const db = await getDB();
  const tx = db.transaction(['expenses', 'categories', 'budgets', 'recurring', 'settings'], 'readonly');
  const [expenses, categories, budgets, recurring, totalBudget] = await Promise.all([
    tx.objectStore('expenses').getAll(),
    tx.objectStore('categories').getAll(),
    tx.objectStore('budgets').getAll(),
    tx.objectStore('recurring').getAll(),
    tx.objectStore('settings').get('totalBudget'),
    tx.done,
  ]);
  return {
    expenses,
    categories: categories.map((c) => (Array.isArray(c.subcategories) ? c : { ...c, subcategories: [] })),
    budgets,
    recurring,
    totalBudget: totalBudget?.value ?? null,
  };
}

/** Remplace toutes les données (restauration d'une sauvegarde), de façon atomique. */
export async function replaceAllData(data: AppDataSnapshot): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['expenses', 'categories', 'budgets', 'recurring', 'settings'], 'readwrite');
  const stores = {
    expenses: tx.objectStore('expenses'),
    categories: tx.objectStore('categories'),
    budgets: tx.objectStore('budgets'),
    recurring: tx.objectStore('recurring'),
    settings: tx.objectStore('settings'),
  };
  await Promise.all([
    stores.expenses.clear(),
    stores.categories.clear(),
    stores.budgets.clear(),
    stores.recurring.clear(),
    stores.settings.clear(),
  ]);
  await Promise.all([
    ...data.categories.map((c) => stores.categories.put(c)),
    ...data.expenses.map((e) => stores.expenses.put(e)),
    ...data.budgets.map((b) => stores.budgets.put(b)),
    ...data.recurring.map((r) => stores.recurring.put(r)),
    ...(data.totalBudget !== null ? [stores.settings.put({ key: 'totalBudget', value: data.totalBudget })] : []),
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
