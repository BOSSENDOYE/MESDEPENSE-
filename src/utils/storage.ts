import type { ISODate, PaymentMethod } from '../types';
import { isPaymentMethod } from './constants';

// Petites préférences et brouillons gardés dans localStorage (écriture synchrone :
// la saisie est sauvegardée à chaque frappe, même si l'app est fermée brutalement).

const PREFIX = 'mes-depenses:';

function read(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    // Stockage indisponible (navigation privée, quota) : on ignore.
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignoré
  }
}

export interface ExpenseDraft {
  amount: string;
  categoryId: string;
  date: ISODate;
  paymentMethod: PaymentMethod;
  note: string;
}

export const NEW_EXPENSE_DRAFT = 'brouillon:nouvelle';

export function editDraftKey(expenseId: string): string {
  return `brouillon:edition:${expenseId}`;
}

function isDraft(value: unknown): value is ExpenseDraft {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.amount === 'string' &&
    typeof v.categoryId === 'string' &&
    typeof v.date === 'string' &&
    typeof v.note === 'string' &&
    isPaymentMethod(v.paymentMethod)
  );
}

export function loadDraft(key: string): ExpenseDraft | null {
  const raw = read(key);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveDraft(key: string, draft: ExpenseDraft): void {
  write(key, JSON.stringify(draft));
}

export function clearDraft(key: string): void {
  remove(key);
}

export function isDraftMeaningful(draft: ExpenseDraft): boolean {
  return draft.amount.trim() !== '' || draft.note.trim() !== '';
}

export function getLastPaymentMethod(): PaymentMethod {
  const value = read('dernier-moyen');
  return isPaymentMethod(value) ? value : 'especes';
}

export function setLastPaymentMethod(method: PaymentMethod): void {
  write('dernier-moyen', method);
}

export function getLastBackupDate(): string | null {
  return read('derniere-sauvegarde');
}

export function setLastBackupDate(iso: string): void {
  write('derniere-sauvegarde', iso);
}
