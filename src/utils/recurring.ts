import type { ISODate, MonthKey, RecurringExpense } from '../types';
import { daysInMonth, monthKeyOf, shiftMonth } from './dates';

/** Nombre maximal d'occurrences rattrapées en une seule ouverture de l'app. */
export const MAX_CATCH_UP = 24;

/** Date de l'occurrence pour un mois donné (jour ramené au dernier jour du mois si besoin). */
export function occurrenceDate(month: MonthKey, dayOfMonth: number): ISODate {
  const day = Math.min(dayOfMonth, daysInMonth(month));
  return `${month}-${String(day).padStart(2, '0')}`;
}

/**
 * Valeur initiale de `lastRunMonth` lors de la création (ou réactivation) d'une récurrence :
 * si la date du mois en cours est déjà passée, on ne crée pas de dépense rétroactive.
 * Si elle tombe aujourd'hui ou plus tard, elle sera créée ce mois-ci.
 */
export function initialLastRunMonth(dayOfMonth: number, today: ISODate): MonthKey {
  const month = monthKeyOf(today);
  return occurrenceDate(month, dayOfMonth) < today ? month : shiftMonth(month, -1);
}

/** Dates des occurrences à créer aujourd'hui (rattrapage des mois manqués inclus). */
export function dueOccurrences(
  rule: Pick<RecurringExpense, 'active' | 'dayOfMonth' | 'lastRunMonth'>,
  today: ISODate,
): ISODate[] {
  if (!rule.active) return [];
  const due: ISODate[] = [];
  const currentMonth = monthKeyOf(today);
  let month = shiftMonth(rule.lastRunMonth, 1);
  while (month <= currentMonth && due.length < MAX_CATCH_UP) {
    const date = occurrenceDate(month, rule.dayOfMonth);
    if (date > today) break;
    due.push(date);
    month = shiftMonth(month, 1);
  }
  return due;
}

export function nextOccurrence(rule: Pick<RecurringExpense, 'dayOfMonth' | 'lastRunMonth'>): ISODate {
  return occurrenceDate(shiftMonth(rule.lastRunMonth, 1), rule.dayOfMonth);
}
