import type { Category } from '../types';
import { getDB } from './database';

export async function saveCategory(category: Category): Promise<void> {
  const db = await getDB();
  await db.put('categories', category);
}

/**
 * Supprime une catégorie : ses dépenses et récurrences sont déplacées vers `fallbackId`,
 * son budget est supprimé. Tout se fait dans une seule transaction.
 * Retourne le nombre de dépenses déplacées.
 */
export async function deleteCategory(id: string, fallbackId: string): Promise<number> {
  if (id === fallbackId) throw new Error('La catégorie de repli doit être différente.');
  const db = await getDB();
  const tx = db.transaction(['categories', 'expenses', 'budgets', 'recurring'], 'readwrite');
  const expenses = await tx.objectStore('expenses').index('by-category').getAll(id);
  const rules = await tx.objectStore('recurring').getAll();

  const writes: Promise<unknown>[] = [];
  for (const e of expenses) writes.push(tx.objectStore('expenses').put({ ...e, categoryId: fallbackId }));
  for (const r of rules) {
    if (r.categoryId === id) writes.push(tx.objectStore('recurring').put({ ...r, categoryId: fallbackId }));
  }
  writes.push(tx.objectStore('budgets').delete(id));
  writes.push(tx.objectStore('categories').delete(id));

  await Promise.all([...writes, tx.done]);
  return expenses.length;
}
