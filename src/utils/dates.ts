import { addMonths, format, getDaysInMonth, isValid, parse, parseISO, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ISODate, MonthKey } from '../types';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

export function toISODate(date: Date): ISODate {
  return format(date, 'yyyy-MM-dd');
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now);
}

export function yesterdayISO(now: Date = new Date()): ISODate {
  return toISODate(subDays(now, 1));
}

export function isValidISODate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const date = parse(value, 'yyyy-MM-dd', new Date());
  return isValid(date) && toISODate(date) === value;
}

export function isValidMonthKey(value: string): boolean {
  if (!MONTH_RE.test(value)) return false;
  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12;
}

export function monthKeyOf(date: ISODate): MonthKey {
  return date.slice(0, 7);
}

export function currentMonthKey(now: Date = new Date()): MonthKey {
  return format(now, 'yyyy-MM');
}

export function dayOfMonthOf(date: ISODate): number {
  return Number(date.slice(8, 10));
}

function monthStart(month: MonthKey): Date {
  return parseISO(`${month}-01`);
}

export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  return format(addMonths(monthStart(month), delta), 'yyyy-MM');
}

export function daysInMonth(month: MonthKey): number {
  return getDaysInMonth(monthStart(month));
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase('fr-FR') + text.slice(1);
}

/** « Octobre 2026 » */
export function formatMonthLabel(month: MonthKey): string {
  return capitalize(format(monthStart(month), 'MMMM yyyy', { locale: fr }));
}

/** « octobre » */
export function formatMonthName(month: MonthKey): string {
  return format(monthStart(month), 'MMMM', { locale: fr });
}

/** « Aujourd'hui », « Hier » ou « Mardi 28 octobre » (+ année si différente). */
export function formatDayHeading(date: ISODate, today: ISODate = todayISO()): string {
  if (date === today) return "Aujourd'hui";
  if (date === yesterdayISO(parseISO(today))) return 'Hier';
  const pattern = date.slice(0, 4) === today.slice(0, 4) ? 'EEEE d MMMM' : 'EEEE d MMMM yyyy';
  return capitalize(format(parseISO(date), pattern, { locale: fr }));
}

/** « Bonjour » ou « Bonsoir » selon l'heure. */
export function greetingFor(date: Date): string {
  const hour = date.getHours();
  return hour >= 5 && hour < 18 ? 'Bonjour' : 'Bonsoir';
}

/** « Jeudi 29 octobre » */
export function formatLongDate(date: ISODate): string {
  return capitalize(format(parseISO(date), 'EEEE d MMMM', { locale: fr }));
}

/** « 5 nov. 2026 » */
export function formatShortDate(date: ISODate): string {
  return format(parseISO(date), 'd MMM yyyy', { locale: fr });
}
