import { getDB } from './database';

export async function setBudget(categoryId: string, monthlyLimit: number): Promise<void> {
  const db = await getDB();
  await db.put('budgets', { categoryId, monthlyLimit });
}

export async function removeBudget(categoryId: string): Promise<void> {
  const db = await getDB();
  await db.delete('budgets', categoryId);
}
