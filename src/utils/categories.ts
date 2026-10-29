import type { Category } from '../types';
import { FALLBACK_CATEGORY_ID } from './constants';
import { normalizeText } from './text';

export function sortCategories(categories: readonly Category[]): Category[] {
  return [...categories].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'fr'));
}

export function nextCategoryOrder(categories: readonly Category[]): number {
  return categories.reduce((max, c) => Math.max(max, c.order), -1) + 1;
}

/** Catégorie qui recevra les dépenses d'une catégorie supprimée. */
export function fallbackCategoryFor(categories: readonly Category[], deletedId: string): Category | null {
  const others = sortCategories(categories).filter((c) => c.id !== deletedId);
  return others.find((c) => c.id === FALLBACK_CATEGORY_ID) ?? others[others.length - 1] ?? null;
}

export function validateCategoryName(
  name: string,
  categories: readonly Category[],
  currentId: string | null,
): string | null {
  const trimmed = name.trim();
  if (trimmed === '') return 'Donnez un nom à la catégorie.';
  if (trimmed.length > 40) return 'Le nom ne doit pas dépasser 40 caractères.';
  const normalized = normalizeText(trimmed);
  if (categories.some((c) => c.id !== currentId && normalizeText(c.name) === normalized)) {
    return 'Une catégorie porte déjà ce nom.';
  }
  return null;
}
