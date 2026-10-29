import type { Category, Expense } from '../types';
import { subcategoryName } from './categories';
import { paymentMethodLabel } from './constants';

const SEPARATOR = ';';

/** Échappe un champ CSV et neutralise les formules (=, +, -, @) pour Excel. */
export function escapeCsvField(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** CSV au format français (séparateur « ; »), trié par date croissante. */
export function expensesToCsv(expenses: readonly Expense[], categories: readonly Category[]): string {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const header = ['Date', 'Montant (FCFA)', 'Catégorie', 'Type', 'Moyen de paiement', 'Note'];
  const rows = [...expenses]
    .sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)))
    .map((e) => {
      const category = byId.get(e.categoryId);
      return [
        e.date,
        String(e.amount),
        category?.name ?? 'Catégorie supprimée',
        (category && subcategoryName(category, e.subcategoryId)) ?? '',
        paymentMethodLabel(e.paymentMethod),
        e.note,
      ];
    });
  return [header, ...rows].map((row) => row.map(escapeCsvField).join(SEPARATOR)).join('\r\n');
}
