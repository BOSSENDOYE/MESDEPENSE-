import type {
  AppDataSnapshot,
  BackupFile,
  Budget,
  Category,
  Expense,
  Income,
  RecurringExpense,
  Result,
  SavingsAuto,
  SavingsGoal,
  SavingsMovement,
  Subcategory,
} from '../types';
import { isPaymentMethod } from './constants';
import { currentMonthKey, isValidISODate, isValidMonthKey } from './dates';
import { MAX_AMOUNT } from './money';

export function createBackup(data: AppDataSnapshot, now: Date = new Date()): BackupFile {
  return { app: 'mes-depenses', version: 1, exportedAt: now.toISOString(), ...data };
}

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= MAX_AMOUNT;
}

function optionalString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function parseExpense(raw: unknown): Expense | string {
  if (!isRecord(raw)) return 'format incorrect';
  if (!isNonEmptyString(raw.id)) return 'identifiant manquant';
  if (!isAmount(raw.amount)) return 'montant incorrect (entier positif attendu)';
  if (!isNonEmptyString(raw.categoryId)) return 'catégorie manquante';
  if (typeof raw.date !== 'string' || !isValidISODate(raw.date)) return 'date incorrecte';
  if (!isPaymentMethod(raw.paymentMethod)) return 'moyen de paiement inconnu';
  const expense: Expense = {
    id: raw.id,
    amount: raw.amount,
    categoryId: raw.categoryId,
    date: raw.date,
    paymentMethod: raw.paymentMethod,
    note: optionalString(raw.note),
    createdAt: isNonEmptyString(raw.createdAt) ? raw.createdAt : `${raw.date}T12:00:00.000Z`,
  };
  if (isNonEmptyString(raw.subcategoryId)) expense.subcategoryId = raw.subcategoryId;
  if (isNonEmptyString(raw.recurringId)) expense.recurringId = raw.recurringId;
  return expense;
}

function parseSubcategories(value: unknown): Subcategory[] | string {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return 'liste des types incorrecte';
  const result: Subcategory[] = [];
  for (const raw of value) {
    if (!isRecord(raw) || !isNonEmptyString(raw.id) || !isNonEmptyString(raw.name)) return 'type incorrect';
    result.push({ id: raw.id, name: raw.name.trim() });
  }
  return result;
}

function parseCategory(raw: unknown, index: number): Category | string {
  if (!isRecord(raw)) return 'format incorrect';
  if (!isNonEmptyString(raw.id)) return 'identifiant manquant';
  if (!isNonEmptyString(raw.name)) return 'nom manquant';
  if (typeof raw.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(raw.color)) return 'couleur incorrecte';
  const subcategories = parseSubcategories(raw.subcategories);
  if (typeof subcategories === 'string') return subcategories;
  return {
    id: raw.id,
    name: raw.name.trim(),
    color: raw.color,
    icon: isNonEmptyString(raw.icon) ? raw.icon : '📦',
    order: typeof raw.order === 'number' && Number.isFinite(raw.order) ? raw.order : index,
    subcategories,
  };
}

function parseBudget(raw: unknown): Budget | string {
  if (!isRecord(raw)) return 'format incorrect';
  if (!isNonEmptyString(raw.categoryId)) return 'catégorie manquante';
  if (!isAmount(raw.monthlyLimit)) return 'plafond incorrect (entier positif attendu)';
  return { categoryId: raw.categoryId, monthlyLimit: raw.monthlyLimit };
}

function parseRecurring(raw: unknown): RecurringExpense | string {
  if (!isRecord(raw)) return 'format incorrect';
  if (!isNonEmptyString(raw.id)) return 'identifiant manquant';
  if (!isAmount(raw.amount)) return 'montant incorrect';
  if (!isNonEmptyString(raw.categoryId)) return 'catégorie manquante';
  if (!isPaymentMethod(raw.paymentMethod)) return 'moyen de paiement inconnu';
  const day = raw.dayOfMonth;
  if (typeof day !== 'number' || !Number.isInteger(day) || day < 1 || day > 31) return 'jour du mois incorrect';
  if (typeof raw.active !== 'boolean') return 'statut actif/inactif manquant';
  const rule: RecurringExpense = {
    id: raw.id,
    amount: raw.amount,
    categoryId: raw.categoryId,
    paymentMethod: raw.paymentMethod,
    note: optionalString(raw.note),
    dayOfMonth: day,
    active: raw.active,
    // Sans information, on considère le mois courant comme traité pour éviter les doublons.
    lastRunMonth:
      typeof raw.lastRunMonth === 'string' && isValidMonthKey(raw.lastRunMonth) ? raw.lastRunMonth : currentMonthKey(),
  };
  if (isNonEmptyString(raw.subcategoryId)) rule.subcategoryId = raw.subcategoryId;
  return rule;
}

function isDay(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 31;
}

function parseAuto(raw: unknown): SavingsAuto | undefined | string {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) return 'versement automatique incorrect';
  if (!isAmount(raw.amount)) return 'montant du versement automatique incorrect';
  if (!isDay(raw.dayOfMonth)) return 'jour du versement automatique incorrect';
  return {
    amount: raw.amount,
    dayOfMonth: raw.dayOfMonth,
    active: raw.active !== false,
    lastRunMonth:
      typeof raw.lastRunMonth === 'string' && isValidMonthKey(raw.lastRunMonth) ? raw.lastRunMonth : currentMonthKey(),
  };
}

function parseGoal(raw: unknown): SavingsGoal | string {
  if (!isRecord(raw)) return 'format incorrect';
  if (!isNonEmptyString(raw.id)) return 'identifiant manquant';
  if (!isNonEmptyString(raw.name)) return 'nom manquant';
  if (raw.target !== null && raw.target !== undefined && !isAmount(raw.target)) return 'montant visé incorrect';
  if (raw.deadline !== null && raw.deadline !== undefined && (typeof raw.deadline !== 'string' || !isValidMonthKey(raw.deadline))) {
    return 'échéance incorrecte';
  }
  const auto = parseAuto(raw.auto);
  if (typeof auto === 'string') return auto;
  const goal: SavingsGoal = {
    id: raw.id,
    name: raw.name.trim(),
    icon: isNonEmptyString(raw.icon) ? raw.icon : '🎯',
    target: isAmount(raw.target) ? raw.target : null,
    deadline: typeof raw.deadline === 'string' ? raw.deadline : null,
    createdAt: isNonEmptyString(raw.createdAt) ? raw.createdAt : new Date(0).toISOString(),
  };
  if (auto) goal.auto = auto;
  return goal;
}

function parseMovement(raw: unknown): SavingsMovement | string {
  if (!isRecord(raw)) return 'format incorrect';
  if (!isNonEmptyString(raw.id)) return 'identifiant manquant';
  if (!isNonEmptyString(raw.goalId)) return 'objectif manquant';
  if (typeof raw.amount !== 'number' || !isAmount(Math.abs(raw.amount))) return 'montant incorrect';
  if (typeof raw.date !== 'string' || !isValidISODate(raw.date)) return 'date incorrecte';
  const movement: SavingsMovement = {
    id: raw.id,
    goalId: raw.goalId,
    amount: raw.amount,
    date: raw.date,
    note: optionalString(raw.note),
    createdAt: isNonEmptyString(raw.createdAt) ? raw.createdAt : `${raw.date}T12:00:00.000Z`,
  };
  if (raw.auto === true) movement.auto = true;
  return movement;
}

function parseIncome(raw: unknown): Income | string {
  if (!isRecord(raw)) return 'format incorrect';
  if (!isNonEmptyString(raw.id)) return 'identifiant manquant';
  if (!isAmount(raw.amount)) return 'montant incorrect (entier positif attendu)';
  if (typeof raw.date !== 'string' || !isValidISODate(raw.date)) return 'date incorrecte';
  return {
    id: raw.id,
    amount: raw.amount,
    date: raw.date,
    source: isNonEmptyString(raw.source) ? raw.source.trim() : 'Revenu',
    note: optionalString(raw.note),
    createdAt: isNonEmptyString(raw.createdAt) ? raw.createdAt : `${raw.date}T12:00:00.000Z`,
  };
}

function optionalAmount(value: unknown, label: string): Result<number | null> {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (!isAmount(value)) return { ok: false, error: `${label} incorrect (entier positif attendu).` };
  return { ok: true, value };
}

function parseList<T>(
  value: unknown,
  label: string,
  parse: (raw: unknown, index: number) => T | string,
): Result<T[]> {
  if (!Array.isArray(value)) return { ok: false, error: `La liste « ${label} » est absente du fichier.` };
  const items: T[] = [];
  for (const [index, raw] of value.entries()) {
    const parsed = parse(raw, index);
    if (typeof parsed === 'string') {
      return { ok: false, error: `${label} n° ${index + 1} invalide : ${parsed}.` };
    }
    items.push(parsed);
  }
  return { ok: true, value: items };
}

/** Valide un fichier de sauvegarde JSON déjà parsé. */
export function parseBackup(json: unknown): Result<AppDataSnapshot> {
  if (!isRecord(json) || json.app !== 'mes-depenses') {
    return { ok: false, error: "Ce fichier n'est pas une sauvegarde de Mes Dépenses." };
  }
  if (json.version !== 1) {
    return { ok: false, error: 'Version de sauvegarde non prise en charge.' };
  }

  const categories = parseList(json.categories, 'Catégorie', parseCategory);
  if (!categories.ok) return categories;
  if (categories.value.length === 0) return { ok: false, error: 'La sauvegarde ne contient aucune catégorie.' };

  const expenses = parseList(json.expenses, 'Dépense', parseExpense);
  if (!expenses.ok) return expenses;
  const budgets = parseList(json.budgets, 'Budget', parseBudget);
  if (!budgets.ok) return budgets;
  const recurring = parseList(json.recurring, 'Dépense récurrente', parseRecurring);
  if (!recurring.ok) return recurring;

  const categoryIds = new Set(categories.value.map((c) => c.id));
  if (categoryIds.size !== categories.value.length) {
    return { ok: false, error: 'La sauvegarde contient des catégories en double.' };
  }
  const orphan = [...expenses.value, ...budgets.value, ...recurring.value].find(
    (item) => !categoryIds.has(item.categoryId),
  );
  if (orphan) {
    return { ok: false, error: `Une donnée fait référence à une catégorie inconnue (« ${orphan.categoryId} »).` };
  }

  // Absents des sauvegardes plus anciennes : facultatifs.
  const totalBudget = optionalAmount(json.totalBudget, 'Budget total du mois');
  if (!totalBudget.ok) return totalBudget;
  const savingsBudget = optionalAmount(json.savingsBudget, "Part d'épargne du budget");
  if (!savingsBudget.ok) return savingsBudget;
  const goals = parseList(json.goals ?? [], "Objectif d'épargne", parseGoal);
  if (!goals.ok) return goals;
  const movements = parseList(json.movements ?? [], "Mouvement d'épargne", parseMovement);
  if (!movements.ok) return movements;
  const incomes = parseList(json.incomes ?? [], 'Revenu', parseIncome);
  if (!incomes.ok) return incomes;

  const goalIds = new Set(goals.value.map((g) => g.id));
  if (movements.value.some((m) => !goalIds.has(m.goalId))) {
    return { ok: false, error: "Un versement fait référence à un objectif d'épargne inconnu." };
  }

  return {
    ok: true,
    value: {
      categories: categories.value,
      expenses: expenses.value,
      budgets: budgets.value,
      recurring: recurring.value,
      totalBudget: totalBudget.value,
      savingsBudget: savingsBudget.value,
      goals: goals.value,
      movements: movements.value,
      incomes: incomes.value,
    },
  };
}
