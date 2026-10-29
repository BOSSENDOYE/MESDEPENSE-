import type { Category, Subcategory } from '../types';
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

/** Nom du type d'une dépense, ou null s'il n'existe pas (ou plus) dans la catégorie. */
export function subcategoryName(category: Category, subcategoryId: string | undefined): string | null {
  if (!subcategoryId) return null;
  return category.subcategories.find((s) => s.id === subcategoryId)?.name ?? null;
}

export function findSubcategoryByName(category: Category, name: string): Subcategory | null {
  const normalized = normalizeText(name);
  return category.subcategories.find((s) => normalizeText(s.name) === normalized) ?? null;
}

/**
 * Retourne l'identifiant du type écrit par l'utilisateur dans la catégorie :
 * réutilise un type existant (même nom, sans tenir compte des accents/majuscules) ou en crée un.
 */
export function resolveTypeName(
  category: Category,
  name: string,
  newId: () => string,
): { category: Category; subcategoryId: string | undefined; created: boolean } {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (trimmed === '') return { category, subcategoryId: undefined, created: false };
  const existing = findSubcategoryByName(category, trimmed);
  if (existing) return { category, subcategoryId: existing.id, created: false };
  const subcategory: Subcategory = { id: newId(), name: trimmed };
  return {
    category: { ...category, subcategories: [...category.subcategories, subcategory] },
    subcategoryId: subcategory.id,
    created: true,
  };
}

export function validateSubcategoryName(name: string, category: Category, currentId: string | null): string | null {
  const trimmed = name.trim();
  if (trimmed === '') return 'Donnez un nom au type.';
  if (trimmed.length > 40) return 'Le nom ne doit pas dépasser 40 caractères.';
  const normalized = normalizeText(trimmed);
  if (category.subcategories.some((s) => s.id !== currentId && normalizeText(s.name) === normalized)) {
    return `« ${trimmed} » existe déjà dans ${category.name}.`;
  }
  return null;
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
