import type { Expense, ExpenseInput } from '../types';
import { createId } from '../utils/id';
import { getDB } from './database';

export async function addExpense(input: ExpenseInput): Promise<Expense> {
  const db = await getDB();
  const expense: Expense = { ...input, id: createId(), createdAt: new Date().toISOString() };
  await db.add('expenses', expense);
  return expense;
}

export async function updateExpense(expense: Expense): Promise<void> {
  const db = await getDB();
  await db.put('expenses', expense);
}

export async function deleteExpense(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('expenses', id);
}
