import type { AppDataSnapshot } from '../types';
import { getDB } from './database';

export async function readAllData(): Promise<AppDataSnapshot> {
  const db = await getDB();
  const tx = db.transaction(['expenses', 'categories', 'budgets', 'recurring'], 'readonly');
  const [expenses, categories, budgets, recurring] = await Promise.all([
    tx.objectStore('expenses').getAll(),
    tx.objectStore('categories').getAll(),
    tx.objectStore('budgets').getAll(),
    tx.objectStore('recurring').getAll(),
    tx.done,
  ]);
  return { expenses, categories, budgets, recurring };
}

/** Remplace toutes les données (restauration d'une sauvegarde), de façon atomique. */
export async function replaceAllData(data: AppDataSnapshot): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['expenses', 'categories', 'budgets', 'recurring'], 'readwrite');
  const stores = {
    expenses: tx.objectStore('expenses'),
    categories: tx.objectStore('categories'),
    budgets: tx.objectStore('budgets'),
    recurring: tx.objectStore('recurring'),
  };
  await Promise.all([
    stores.expenses.clear(),
    stores.categories.clear(),
    stores.budgets.clear(),
    stores.recurring.clear(),
  ]);
  await Promise.all([
    ...data.categories.map((c) => stores.categories.put(c)),
    ...data.expenses.map((e) => stores.expenses.put(e)),
    ...data.budgets.map((b) => stores.budgets.put(b)),
    ...data.recurring.map((r) => stores.recurring.put(r)),
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
