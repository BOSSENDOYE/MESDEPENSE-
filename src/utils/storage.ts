import type { ISODate, PaymentMethod } from '../types';
import { isPaymentMethod } from './constants';
import { isPinConfig, type PinConfig } from './pin';

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
  /** Type écrit librement par l'utilisateur ('' = aucun). */
  typeName: string;
  date: ISODate;
  paymentMethod: PaymentMethod;
  note: string;
}

export const NEW_EXPENSE_DRAFT = 'brouillon:nouvelle';

export function editDraftKey(expenseId: string): string {
  return `brouillon:edition:${expenseId}`;
}

function toDraft(value: unknown): ExpenseDraft | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.amount !== 'string' ||
    typeof v.categoryId !== 'string' ||
    typeof v.date !== 'string' ||
    typeof v.note !== 'string' ||
    !isPaymentMethod(v.paymentMethod)
  ) {
    return null;
  }
  return {
    amount: v.amount,
    categoryId: v.categoryId,
    // Absent des brouillons enregistrés avant l'ajout des types.
    typeName: typeof v.typeName === 'string' ? v.typeName : '',
    date: v.date,
    paymentMethod: v.paymentMethod,
    note: v.note,
  };
}

export function loadDraft(key: string): ExpenseDraft | null {
  const raw = read(key);
  if (raw === null) return null;
  try {
    return toDraft(JSON.parse(raw));
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
  return draft.amount.trim() !== '' || draft.note.trim() !== '' || draft.typeName.trim() !== '';
}

export function getLastPaymentMethod(): PaymentMethod {
  const value = read('dernier-moyen');
  return isPaymentMethod(value) ? value : 'especes';
}

export function setLastPaymentMethod(method: PaymentMethod): void {
  write('dernier-moyen', method);
}

// --- Sécurité (code PIN) ---

export function getPinConfig(): PinConfig | null {
  const raw = read('securite:pin');
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isPinConfig(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function setPinConfig(config: PinConfig): void {
  write('securite:pin', JSON.stringify(config));
}

export function clearPinConfig(): void {
  remove('securite:pin');
}

/** L'utilisateur a choisi « Plus tard » à l'écran de création du code. */
export function getPinSkipped(): boolean {
  return read('securite:pin-ignore') === '1';
}

export function setPinSkipped(skipped: boolean): void {
  if (skipped) write('securite:pin-ignore', '1');
  else remove('securite:pin-ignore');
}

export interface PinAttempts {
  failures: number;
  /** Horodatage (ms) jusqu'auquel la saisie est bloquée ; 0 = pas de blocage. */
  lockUntil: number;
}

export function getPinAttempts(): PinAttempts {
  try {
    const parsed: unknown = JSON.parse(read('securite:essais') ?? 'null');
    if (typeof parsed === 'object' && parsed !== null) {
      const v = parsed as Record<string, unknown>;
      if (typeof v.failures === 'number' && typeof v.lockUntil === 'number') {
        return { failures: v.failures, lockUntil: v.lockUntil };
      }
    }
  } catch {
    // valeur corrompue : on repart de zéro
  }
  return { failures: 0, lockUntil: 0 };
}

export function setPinAttempts(attempts: PinAttempts): void {
  write('securite:essais', JSON.stringify(attempts));
}

/** Délai (secondes) en arrière-plan avant verrouillage automatique. */
export const AUTO_LOCK_CHOICES: readonly { seconds: number; label: string }[] = [
  { seconds: 0, label: 'Immédiatement' },
  { seconds: 60, label: 'Après 1 minute' },
  { seconds: 300, label: 'Après 5 minutes' },
  { seconds: 1800, label: 'Après 30 minutes' },
];

export function getAutoLockSeconds(): number {
  const raw = read('securite:delai');
  const value = Number(raw);
  return raw !== null && AUTO_LOCK_CHOICES.some((c) => c.seconds === value) ? value : 60;
}

export function setAutoLockSeconds(seconds: number): void {
  write('securite:delai', String(seconds));
}

/** Efface toutes les préférences et brouillons de l'application (code oublié). */
export function clearAllLocalData(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(PREFIX)) localStorage.removeItem(key);
    }
  } catch {
    // ignoré
  }
}

export function getLastBackupDate(): string | null {
  return read('derniere-sauvegarde');
}

export function setLastBackupDate(iso: string): void {
  write('derniere-sauvegarde', iso);
}
