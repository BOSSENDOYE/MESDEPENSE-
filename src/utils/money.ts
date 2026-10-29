import type { Result } from '../types';

const NBSP = ' ';

/** Montant maximal accepté pour une saisie (1 milliard FCFA). */
export const MAX_AMOUNT = 1_000_000_000;

/** 12500 → « 12 500 » (espaces insécables). */
export function formatNumber(value: number): string {
  const sign = value < 0 ? '-' : '';
  const digits = Math.round(Math.abs(value)).toString();
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** 12500 → « 12 500 FCFA » */
export function formatFCFA(value: number): string {
  return `${formatNumber(value)}${NBSP}FCFA`;
}

function oneDecimal(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',');
}

/** Format court pour les axes de graphique : 12 500 → « 12,5 k », 2 000 000 → « 2 M ». */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${oneDecimal(value / 1_000_000)}${NBSP}M`;
  if (abs >= 1_000) return `${oneDecimal(value / 1_000)}${NBSP}k`;
  return String(Math.round(value));
}

/** 12.4 → « 12 % » */
export function formatPercent(value: number): string {
  return `${Math.round(value)}${NBSP}%`;
}

/**
 * Valide une saisie de montant : entier strictement positif, sans décimales.
 * Les espaces (séparateurs de milliers) sont tolérés.
 */
export function validateAmount(raw: string): Result<number> {
  const compact = raw.replace(/[\s  ]/g, '');
  if (compact === '') return { ok: false, error: 'Saisissez un montant.' };
  if (/[.,]/.test(compact)) {
    return { ok: false, error: 'Le montant doit être un nombre entier (pas de centimes en FCFA).' };
  }
  if (!/^\d+$/.test(compact)) {
    return { ok: false, error: 'Le montant ne doit contenir que des chiffres.' };
  }
  const value = Number(compact);
  if (!Number.isSafeInteger(value) || value <= 0) {
    return { ok: false, error: 'Le montant doit être supérieur à 0.' };
  }
  if (value > MAX_AMOUNT) {
    return { ok: false, error: `Le montant ne peut pas dépasser ${formatFCFA(MAX_AMOUNT)}.` };
  }
  return { ok: true, value };
}
