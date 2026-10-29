import { describe, expect, it } from 'vitest';
import type { Category, Expense } from '../types';
import { resolveTypeName, subcategoryName } from './categories';
import { filterExpenses, subcategoryBreakdown } from './stats';

const transport: Category = {
  id: 'transport',
  name: 'Transport',
  color: '#2563eb',
  icon: '🚌',
  order: 1,
  subcategories: [{ id: 't1', name: 'Taxi' }],
};

describe('resolveTypeName (type écrit par l’utilisateur)', () => {
  it('réutilise un type existant sans tenir compte des majuscules ni des espaces', () => {
    const result = resolveTypeName(transport, '  TAXI ', () => 'nouveau');
    expect(result).toEqual({ category: transport, subcategoryId: 't1', created: false });
  });

  it('crée un nouveau type quand le nom est inconnu', () => {
    const result = resolveTypeName(transport, 'Car  rapide', () => 't2');
    expect(result.created).toBe(true);
    expect(result.subcategoryId).toBe('t2');
    expect(result.category.subcategories).toEqual([
      { id: 't1', name: 'Taxi' },
      { id: 't2', name: 'Car rapide' },
    ]);
  });

  it('ne crée rien si le champ est vide', () => {
    expect(resolveTypeName(transport, '   ', () => 'x')).toEqual({
      category: transport,
      subcategoryId: undefined,
      created: false,
    });
  });

  it('retrouve le nom d’un type, ou null s’il a été supprimé', () => {
    expect(subcategoryName(transport, 't1')).toBe('Taxi');
    expect(subcategoryName(transport, 'disparu')).toBeNull();
    expect(subcategoryName(transport, undefined)).toBeNull();
  });
});

const base = { paymentMethod: 'especes', note: '', createdAt: '2026-10-01T10:00:00.000Z', date: '2026-10-01' } as const;
const expenses: Expense[] = [
  { ...base, id: 'a', amount: 2000, categoryId: 'transport', subcategoryId: 't1' },
  { ...base, id: 'b', amount: 3000, categoryId: 'transport', subcategoryId: 't1' },
  { ...base, id: 'c', amount: 1000, categoryId: 'transport' },
];

describe('statistiques par type', () => {
  it('totalise par couple catégorie / type', () => {
    expect(subcategoryBreakdown(expenses)).toEqual([
      { categoryId: 'transport', subcategoryId: 't1', total: 5000, share: 5000 / 6000 },
      { categoryId: 'transport', subcategoryId: null, total: 1000, share: 1000 / 6000 },
    ]);
  });

  it('filtre par type et trouve le type à la recherche', () => {
    expect(filterExpenses(expenses, { month: null, categoryId: 'transport', subcategoryId: 't1', query: '' })).toHaveLength(2);
    const describe = (e: Expense) => subcategoryName(transport, e.subcategoryId) ?? '';
    expect(filterExpenses(expenses, { month: null, categoryId: null, query: 'taxi' }, describe)).toHaveLength(2);
  });
});
