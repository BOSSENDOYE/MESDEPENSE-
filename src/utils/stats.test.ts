import { describe, expect, it } from 'vitest';
import type { Expense } from '../types';
import {
  availableMonths,
  budgetLevel,
  budgetProgress,
  categoryBreakdown,
  dailyTotals,
  expensesInMonth,
  filterExpenses,
  groupByDay,
  largestExpense,
  monthPace,
  paymentBreakdown,
  percentChange,
  sumAmounts,
  totalUpToDay,
} from './stats';

let seq = 0;
function exp(partial: Partial<Expense> & Pick<Expense, 'amount' | 'date'>): Expense {
  seq += 1;
  return {
    id: `e${seq}`,
    categoryId: 'alimentation',
    paymentMethod: 'especes',
    note: '',
    createdAt: `${partial.date}T10:00:0${seq % 10}.000Z`,
    ...partial,
  };
}

const data: Expense[] = [
  exp({ amount: 2500, date: '2026-10-01', note: 'Pain et café' }),
  exp({ amount: 10000, date: '2026-10-01', categoryId: 'transport', note: 'Taxi aéroport' }),
  exp({ amount: 7500, date: '2026-10-15', categoryId: 'transport' }),
  exp({ amount: 150000, date: '2026-09-05', categoryId: 'logement', note: 'Loyer' }),
  exp({ amount: 3000, date: '2026-09-20' }),
];

describe('totaux', () => {
  it('filtre par mois et somme', () => {
    const oct = expensesInMonth(data, '2026-10');
    expect(oct).toHaveLength(3);
    expect(sumAmounts(oct)).toBe(20000);
    expect(sumAmounts([])).toBe(0);
  });

  it('calcule le total jusqu’à un jour donné', () => {
    expect(totalUpToDay(expensesInMonth(data, '2026-09'), 10)).toBe(150000);
    expect(totalUpToDay(expensesInMonth(data, '2026-09'), 31)).toBe(153000);
  });
});

describe('categoryBreakdown', () => {
  it('trie par montant décroissant avec les parts', () => {
    const result = categoryBreakdown(expensesInMonth(data, '2026-10'));
    expect(result.map((r) => r.categoryId)).toEqual(['transport', 'alimentation']);
    expect(result[0]?.total).toBe(17500);
    expect(result[0]?.share).toBeCloseTo(0.875);
  });

  it('gère une liste vide', () => {
    expect(categoryBreakdown([])).toEqual([]);
  });
});

describe('dailyTotals', () => {
  it('renvoie un élément par jour du mois', () => {
    const result = dailyTotals(data, '2026-10');
    expect(result).toHaveLength(31);
    expect(result[0]).toEqual({ day: 1, date: '2026-10-01', total: 12500 });
    expect(result[14]?.total).toBe(7500);
    expect(result[1]?.total).toBe(0);
  });

  it('gère février bissextile', () => {
    expect(dailyTotals([], '2028-02')).toHaveLength(29);
    expect(dailyTotals([], '2026-02')).toHaveLength(28);
  });
});

describe('percentChange', () => {
  it('calcule la variation', () => {
    expect(percentChange(120, 100)).toBe(20);
    expect(percentChange(50, 100)).toBe(-50);
  });
  it('renvoie null si le mois précédent est à 0', () => {
    expect(percentChange(100, 0)).toBeNull();
  });
});

describe('budgets', () => {
  it('niveaux à 80 % et 100 %', () => {
    expect(budgetLevel(79, 100)).toBe('ok');
    expect(budgetLevel(80, 100)).toBe('warning');
    expect(budgetLevel(99, 100)).toBe('warning');
    expect(budgetLevel(100, 100)).toBe('over');
    expect(budgetLevel(150, 100)).toBe('over');
  });

  it('calcule la progression par catégorie', () => {
    const [p] = budgetProgress([{ categoryId: 'transport', monthlyLimit: 20000 }], expensesInMonth(data, '2026-10'));
    expect(p).toMatchObject({ spent: 17500, remaining: 2500, level: 'warning' });
  });
});

describe('groupByDay', () => {
  it('regroupe par jour du plus récent au plus ancien', () => {
    const groups = groupByDay(expensesInMonth(data, '2026-10'));
    expect(groups.map((g) => g.date)).toEqual(['2026-10-15', '2026-10-01']);
    expect(groups[1]?.total).toBe(12500);
    expect(groups[1]?.expenses).toHaveLength(2);
  });
});

describe('filterExpenses', () => {
  it('cherche dans la note sans tenir compte des accents ni de la casse', () => {
    const result = filterExpenses(data, { month: null, categoryId: null, query: 'AEROPORT' });
    expect(result).toHaveLength(1);
    expect(result[0]?.amount).toBe(10000);
  });

  it('combine mois et catégorie', () => {
    expect(filterExpenses(data, { month: '2026-10', categoryId: 'transport', query: '' })).toHaveLength(2);
    expect(filterExpenses(data, { month: '2026-09', categoryId: 'transport', query: '' })).toHaveLength(0);
  });
});

describe('indicateurs du tableau de bord', () => {
  it('répartit par moyen de paiement', () => {
    const result = paymentBreakdown([
      exp({ amount: 3000, date: '2026-10-01', paymentMethod: 'wave' }),
      exp({ amount: 1000, date: '2026-10-02' }),
    ]);
    expect(result).toEqual([
      { method: 'wave', total: 3000, share: 0.75 },
      { method: 'especes', total: 1000, share: 0.25 },
    ]);
  });

  it('trouve la plus grosse dépense', () => {
    expect(largestExpense(data)?.amount).toBe(150000);
    expect(largestExpense([])).toBeNull();
  });

  it('calcule le rythme et la projection du mois en cours', () => {
    expect(monthPace(30000, '2026-10', '2026-10-10')).toEqual({ elapsedDays: 10, dailyAverage: 3000, projected: 93000 });
  });

  it('un mois passé est complet', () => {
    expect(monthPace(30000, '2026-09', '2026-10-10')).toEqual({ elapsedDays: 30, dailyAverage: 1000, projected: 30000 });
  });
});

describe('availableMonths', () => {
  it('inclut le mois courant et trie du plus récent au plus ancien', () => {
    expect(availableMonths(data, '2026-11')).toEqual(['2026-11', '2026-10', '2026-09']);
  });
});
