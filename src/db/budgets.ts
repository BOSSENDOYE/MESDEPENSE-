import { getDB } from './database';

export async function setBudget(categoryId: string, monthlyLimit: number): Promise<void> {
  const db = await getDB();
  await db.put('budgets', { categoryId, monthlyLimit });
}

export async function removeBudget(categoryId: string): Promise<void> {
  const db = await getDB();
  await db.delete('budgets', categoryId);
}

/** Budget total du mois ; null le supprime. */
export async function setTotalBudget(amount: number | null): Promise<void> {
  const db = await getDB();
  if (amount === null) await db.delete('settings', 'totalBudget');
  else await db.put('settings', { key: 'totalBudget', value: amount });
}
