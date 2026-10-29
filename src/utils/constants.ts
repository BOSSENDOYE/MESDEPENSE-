import type { Category, PaymentMethod } from '../types';

export const PAYMENT_METHODS: readonly { id: PaymentMethod; label: string }[] = [
  { id: 'especes', label: 'Espèces' },
  { id: 'wave', label: 'Wave' },
  { id: 'orange_money', label: 'Orange Money' },
  { id: 'carte', label: 'Carte' },
  { id: 'virement', label: 'Virement' },
];

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return PAYMENT_METHODS.some((m) => m.id === value);
}

export function paymentMethodLabel(id: PaymentMethod): string {
  return PAYMENT_METHODS.find((m) => m.id === id)?.label ?? id;
}

/** Identifiant de la catégorie de repli lors d'une suppression. */
export const FALLBACK_CATEGORY_ID = 'autres';

// Aucun type prédéfini : l'utilisateur écrit lui-même ses types lors de la saisie.
export const DEFAULT_CATEGORIES: readonly Category[] = [
  { id: 'alimentation', name: 'Alimentation', icon: '🍚', color: '#16a34a', order: 0, subcategories: [] },
  { id: 'transport', name: 'Transport', icon: '🚌', color: '#2563eb', order: 1, subcategories: [] },
  { id: 'logement', name: 'Logement', icon: '🏠', color: '#9333ea', order: 2, subcategories: [] },
  { id: 'factures', name: 'Factures', icon: '💡', color: '#ea580c', order: 3, subcategories: [] },
  { id: 'credit', name: 'Crédit téléphone/data', icon: '📱', color: '#0891b2', order: 4, subcategories: [] },
  { id: 'sante', name: 'Santé', icon: '💊', color: '#dc2626', order: 5, subcategories: [] },
  { id: 'education', name: 'Éducation', icon: '🎓', color: '#ca8a04', order: 6, subcategories: [] },
  { id: 'loisirs', name: 'Loisirs', icon: '🎉', color: '#db2777', order: 7, subcategories: [] },
  { id: 'famille', name: 'Famille', icon: '👨‍👩‍👧', color: '#92400e', order: 8, subcategories: [] },
  { id: 'autres', name: 'Autres', icon: '📦', color: '#64748b', order: 9, subcategories: [] },
];

export const COLOR_CHOICES: readonly string[] = [
  '#16a34a', '#059669', '#0d9488', '#0891b2', '#2563eb', '#4f46e5', '#7c3aed', '#9333ea',
  '#c026d3', '#db2777', '#dc2626', '#ea580c', '#ca8a04', '#92400e', '#65a30d', '#64748b',
];

export const ICON_CHOICES: readonly string[] = [
  '🍚', '🛒', '🍞', '🚌', '🚕', '⛽', '🏠', '💡', '💧', '🌐', '📱', '💊', '🏥', '🎓',
  '📚', '🎉', '⚽', '🎬', '👨‍👩‍👧', '🎁', '🕌', '👕', '💇', '🐑', '✈️', '💼', '🧾', '🔧',
  '🐾', '💳', '🏦', '📦',
];

export const UNKNOWN_CATEGORY: Category = {
  id: '__inconnue__',
  name: 'Catégorie supprimée',
  icon: '❔',
  color: '#94a3b8',
  order: Number.MAX_SAFE_INTEGER,
  subcategories: [],
};
