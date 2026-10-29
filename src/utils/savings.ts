import type { Income, ISODate, MonthKey, Result, SavingsGoal, SavingsMovement } from '../types';
import { monthKeyOf } from './dates';
import { normalizeText } from './text';

// Épargne et revenus : fonctions pures (testées).

export const GOAL_ICON_CHOICES = ['🎯', '🐑', '🛟', '📱', '🏠', '🚗', '🏍️', '✈️', '🕋', '🎓', '💍', '👶', '💻', '🎁', '🏥', '💰'] as const;

export const INCOME_SOURCE_CHOICES = ['Salaire', 'Commerce', 'Transfert reçu', 'Prime', 'Bourse', 'Location'] as const;

/** Solde de chaque objectif (versements − retraits). */
export function balancesByGoal(movements: readonly SavingsMovement[]): Map<string, number> {
  const balances = new Map<string, number>();
  for (const m of movements) balances.set(m.goalId, (balances.get(m.goalId) ?? 0) + m.amount);
  return balances;
}

/** Total épargné, tous objectifs confondus. */
export function totalSaved(movements: readonly SavingsMovement[]): number {
  return movements.reduce((sum, m) => sum + m.amount, 0);
}

/** Épargne nette d'un mois (versements − retraits). */
export function savedInMonth(movements: readonly SavingsMovement[], month: MonthKey): number {
  return movements.reduce((sum, m) => (monthKeyOf(m.date) === month ? sum + m.amount : sum), 0);
}

export function incomesInMonth(incomes: readonly Income[], month: MonthKey): Income[] {
  return incomes.filter((i) => monthKeyOf(i.date) === month);
}

/** Nombre de mois restants jusqu'à l'échéance, mois en cours compris (au moins 1). */
export function monthsUntil(deadline: MonthKey, today: ISODate): number {
  const [y1, m1] = monthKeyOf(today).split('-').map(Number) as [number, number];
  const [y2, m2] = deadline.split('-').map(Number) as [number, number];
  return Math.max(1, (y2 - y1) * 12 + (m2 - m1) + 1);
}

export interface GoalPlan {
  balance: number;
  /** Reste à épargner (0 si atteint, null sans montant cible). */
  remaining: number | null;
  /** Avancement 0–100 (null sans montant cible). */
  percent: number | null;
  /** Montant à mettre de côté chaque mois pour tenir l'échéance (arrondi à 500 au-dessus). */
  perMonth: number | null;
  reached: boolean;
  /** Échéance dépassée sans avoir atteint l'objectif. */
  late: boolean;
}

export function goalPlan(goal: Pick<SavingsGoal, 'target' | 'deadline'>, balance: number, today: ISODate): GoalPlan {
  if (goal.target === null) {
    return { balance, remaining: null, percent: null, perMonth: null, reached: false, late: false };
  }
  const remaining = Math.max(0, goal.target - balance);
  const reached = remaining === 0;
  const percent = Math.min(100, Math.max(0, (balance / goal.target) * 100));
  const late = !reached && goal.deadline !== null && goal.deadline < monthKeyOf(today);
  const perMonth =
    reached || goal.deadline === null
      ? null
      : late
        ? remaining
        : Math.ceil(remaining / monthsUntil(goal.deadline, today) / 500) * 500;
  return { balance, remaining, percent, perMonth, reached, late };
}

export interface MonthMoney {
  income: number;
  spent: number;
  saved: number;
  /** Revenus − dépenses − épargne. */
  left: number;
  /** Part des revenus épargnée (null sans revenu). */
  savingsRate: number | null;
}

export function monthMoney(income: number, spent: number, saved: number): MonthMoney {
  return {
    income,
    spent,
    saved,
    left: income - spent - saved,
    savingsRate: income > 0 ? (saved / income) * 100 : null,
  };
}

export function validateGoalName(name: string, goals: readonly SavingsGoal[], currentId?: string): Result<string> {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (trimmed === '') return { ok: false, error: "Donnez un nom à l'objectif." };
  if (trimmed.length > 40) return { ok: false, error: 'Nom trop long (40 caractères maximum).' };
  const normalized = normalizeText(trimmed);
  if (goals.some((g) => g.id !== currentId && normalizeText(g.name) === normalized)) {
    return { ok: false, error: 'Un objectif porte déjà ce nom.' };
  }
  return { ok: true, value: trimmed };
}

/** Objectifs triés : en cours d'abord (les plus avancés en tête), puis atteints, puis épargne libre. */
export function sortGoals(goals: readonly SavingsGoal[], balances: ReadonlyMap<string, number>): SavingsGoal[] {
  const rank = (g: SavingsGoal) => {
    if (g.target === null) return 2;
    return (balances.get(g.id) ?? 0) >= g.target ? 1 : 0;
  };
  const progress = (g: SavingsGoal) => (g.target ? (balances.get(g.id) ?? 0) / g.target : 0);
  return [...goals].sort((a, b) => rank(a) - rank(b) || progress(b) - progress(a) || a.createdAt.localeCompare(b.createdAt));
}
