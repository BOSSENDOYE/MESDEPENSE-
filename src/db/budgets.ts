import { getDB, type SettingKey } from './database';

export async function setBudget(categoryId: string, monthlyLimit: number): Promise<void> {
  const db = await getDB();
  await db.put('budgets', { categoryId, monthlyLimit });
}

export async function removeBudget(categoryId: string): Promise<void> {
  const db = await getDB();
  await db.delete('budgets', categoryId);
}

async function setSetting(key: SettingKey, amount: number | null): Promise<void> {
  const db = await getDB();
  if (amount === null) await db.delete('settings', key);
  else await db.put('settings', { key, value: amount });
}

/** Budget total du mois ; null le supprime. */
export function setTotalBudget(amount: number | null): Promise<void> {
  return setSetting('totalBudget', amount);
}

/** Part du budget du mois réservée à l'épargne ; null la supprime. */
export function setSavingsBudget(amount: number | null): Promise<void> {
  return setSetting('savingsBudget', amount);
}
