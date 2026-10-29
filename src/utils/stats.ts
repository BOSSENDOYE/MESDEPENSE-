import type { Budget, Expense, ISODate, MonthKey, PaymentMethod } from '../types';
import { dayOfMonthOf, daysInMonth, monthKeyOf } from './dates';
import { normalizeText } from './text';

// Fonctions pures de calcul : aucune dépendance au DOM ni à IndexedDB.

export function expensesInMonth(expenses: readonly Expense[], month: MonthKey): Expense[] {
  return expenses.filter((e) => monthKeyOf(e.date) === month);
}

export function sumAmounts(expenses: readonly Pick<Expense, 'amount'>[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

/** Total des dépenses dont le jour du mois est ≤ `day` (comparaison « à date »). */
export function totalUpToDay(expenses: readonly Expense[], day: number): number {
  return sumAmounts(expenses.filter((e) => dayOfMonthOf(e.date) <= day));
}

export function totalsByCategory(expenses: readonly Expense[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const e of expenses) {
    totals.set(e.categoryId, (totals.get(e.categoryId) ?? 0) + e.amount);
  }
  return totals;
}

export interface CategoryShare {
  categoryId: string;
  total: number;
  /** Part entre 0 et 1. */
  share: number;
}

/** Répartition par catégorie, triée par montant décroissant. */
export function categoryBreakdown(expenses: readonly Expense[]): CategoryShare[] {
  const grandTotal = sumAmounts(expenses);
  return [...totalsByCategory(expenses)]
    .map(([categoryId, total]) => ({
      categoryId,
      total,
      share: grandTotal > 0 ? total / grandTotal : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export interface DailyTotal {
  day: number;
  date: ISODate;
  total: number;
}

/** Un élément par jour du mois (y compris les jours sans dépense). */
export function dailyTotals(expenses: readonly Expense[], month: MonthKey): DailyTotal[] {
  const days = daysInMonth(month);
  const totals = Array.from({ length: days }, (_, i) => {
    const day = i + 1;
    return { day, date: `${month}-${String(day).padStart(2, '0')}`, total: 0 };
  });
  for (const e of expenses) {
    if (monthKeyOf(e.date) !== month) continue;
    const entry = totals[dayOfMonthOf(e.date) - 1];
    if (entry) entry.total += e.amount;
  }
  return totals;
}

/** Variation en % de `previous` vers `current`, ou null si `previous` vaut 0. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export type BudgetLevel = 'ok' | 'warning' | 'over';

export const BUDGET_WARNING_RATIO = 0.8;

export function budgetLevel(spent: number, limit: number): BudgetLevel {
  if (limit <= 0) return 'ok';
  const ratio = spent / limit;
  if (ratio >= 1) return 'over';
  if (ratio >= BUDGET_WARNING_RATIO) return 'warning';
  return 'ok';
}

export interface BudgetProgress {
  categoryId: string;
  limit: number;
  spent: number;
  ratio: number;
  /** Négatif en cas de dépassement. */
  remaining: number;
  level: BudgetLevel;
}

export function budgetProgress(budgets: readonly Budget[], monthExpenses: readonly Expense[]): BudgetProgress[] {
  const totals = totalsByCategory(monthExpenses);
  return budgets.map((b) => {
    const spent = totals.get(b.categoryId) ?? 0;
    return {
      categoryId: b.categoryId,
      limit: b.monthlyLimit,
      spent,
      ratio: b.monthlyLimit > 0 ? spent / b.monthlyLimit : 0,
      remaining: b.monthlyLimit - spent,
      level: budgetLevel(spent, b.monthlyLimit),
    };
  });
}

export interface DayGroup {
  date: ISODate;
  total: number;
  expenses: Expense[];
}

/** Regroupe par jour : jours du plus récent au plus ancien, puis saisies les plus récentes d'abord. */
export function groupByDay(expenses: readonly Expense[]): DayGroup[] {
  const groups = new Map<ISODate, Expense[]>();
  for (const e of expenses) {
    const list = groups.get(e.date);
    if (list) list.push(e);
    else groups.set(e.date, [e]);
  }
  return [...groups]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([date, items]) => ({
      date,
      total: sumAmounts(items),
      expenses: [...items].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0)),
    }));
}

export interface ExpenseFilter {
  /** null = tous les mois */
  month: MonthKey | null;
  /** null = toutes les catégories */
  categoryId: string | null;
  /** Recherche dans la note (insensible à la casse et aux accents). */
  query: string;
}

export function filterExpenses(expenses: readonly Expense[], filter: ExpenseFilter): Expense[] {
  const query = normalizeText(filter.query);
  return expenses.filter(
    (e) =>
      (filter.month === null || monthKeyOf(e.date) === filter.month) &&
      (filter.categoryId === null || e.categoryId === filter.categoryId) &&
      (query === '' || normalizeText(e.note).includes(query)),
  );
}

export interface PaymentShare {
  method: PaymentMethod;
  total: number;
  share: number;
}

/** Répartition par moyen de paiement, triée par montant décroissant. */
export function paymentBreakdown(expenses: readonly Expense[]): PaymentShare[] {
  const grandTotal = sumAmounts(expenses);
  const totals = new Map<PaymentMethod, number>();
  for (const e of expenses) totals.set(e.paymentMethod, (totals.get(e.paymentMethod) ?? 0) + e.amount);
  return [...totals]
    .map(([method, total]) => ({ method, total, share: grandTotal > 0 ? total / grandTotal : 0 }))
    .sort((a, b) => b.total - a.total);
}

export function largestExpense(expenses: readonly Expense[]): Expense | null {
  return expenses.reduce<Expense | null>((max, e) => (max === null || e.amount > max.amount ? e : max), null);
}

export interface MonthPace {
  /** Jours écoulés du mois (tous pour un mois passé, 0 pour un mois futur). */
  elapsedDays: number;
  dailyAverage: number;
  /** Estimation du total en fin de mois au rythme actuel. */
  projected: number;
}

export function monthPace(total: number, month: MonthKey, today: ISODate): MonthPace {
  const days = daysInMonth(month);
  const currentMonth = monthKeyOf(today);
  const elapsedDays = month < currentMonth ? days : month === currentMonth ? dayOfMonthOf(today) : 0;
  const dailyAverage = elapsedDays > 0 ? Math.round(total / elapsedDays) : 0;
  const projected = elapsedDays > 0 ? Math.round((total / elapsedDays) * days) : total;
  return { elapsedDays, dailyAverage, projected };
}

/** Mois présents dans les données (+ mois courant), du plus récent au plus ancien. */
export function availableMonths(expenses: readonly Expense[], current: MonthKey): MonthKey[] {
  const months = new Set<MonthKey>([current]);
  for (const e of expenses) months.add(monthKeyOf(e.date));
  return [...months].sort().reverse();
}
