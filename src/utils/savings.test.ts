import { describe, expect, it } from 'vitest';
import type { SavingsGoal, SavingsMovement } from '../types';
import { balancesByGoal, goalPlan, monthMoney, monthsUntil, savedInMonth, sortGoals, validateGoalName } from './savings';

const TODAY = '2026-10-29';

function movement(goalId: string, amount: number, date: string): SavingsMovement {
  return { id: `${goalId}-${amount}-${date}`, goalId, amount, date, note: '', createdAt: `${date}T10:00:00Z` };
}

function goal(id: string, target: number | null, deadline: string | null = null): SavingsGoal {
  return { id, name: id, icon: '🎯', target, deadline, createdAt: '2026-01-01T00:00:00Z' };
}

const movements = [
  movement('tabaski', 50000, '2026-09-01'),
  movement('tabaski', 20000, '2026-10-05'),
  movement('tabaski', -5000, '2026-10-20'),
  movement('urgence', 10000, '2026-10-01'),
];

describe('soldes', () => {
  it('additionne versements et retraits par objectif', () => {
    const balances = balancesByGoal(movements);
    expect(balances.get('tabaski')).toBe(65000);
    expect(balances.get('urgence')).toBe(10000);
  });

  it('épargne nette du mois', () => {
    expect(savedInMonth(movements, '2026-10')).toBe(25000);
    expect(savedInMonth(movements, '2026-09')).toBe(50000);
  });
});

describe('monthsUntil', () => {
  it('compte le mois en cours', () => {
    expect(monthsUntil('2026-10', TODAY)).toBe(1);
    expect(monthsUntil('2027-06', TODAY)).toBe(9);
    expect(monthsUntil('2026-01', TODAY)).toBe(1);
  });
});

describe('goalPlan', () => {
  it('calcule le reste et l’effort mensuel (arrondi à 500 au-dessus)', () => {
    expect(goalPlan(goal('t', 150000, '2027-06'), 65000, TODAY)).toEqual({
      balance: 65000,
      remaining: 85000,
      percent: (65000 / 150000) * 100,
      perMonth: 9500,
      reached: false,
      late: false,
    });
  });

  it('objectif atteint', () => {
    expect(goalPlan(goal('t', 50000, '2027-06'), 60000, TODAY)).toMatchObject({ remaining: 0, percent: 100, reached: true, perMonth: null });
  });

  it('échéance dépassée : tout le reste est dû', () => {
    expect(goalPlan(goal('t', 50000, '2026-08'), 20000, TODAY)).toMatchObject({ late: true, perMonth: 30000 });
  });

  it('épargne libre : pas de pourcentage', () => {
    expect(goalPlan(goal('t', null), 20000, TODAY)).toMatchObject({ percent: null, remaining: null, perMonth: null });
  });
});

describe('monthMoney', () => {
  it('reste à vivre et taux d’épargne', () => {
    expect(monthMoney(250000, 180000, 25000)).toEqual({ income: 250000, spent: 180000, saved: 25000, left: 45000, savingsRate: 10 });
    expect(monthMoney(0, 1000, 0).savingsRate).toBeNull();
  });
});

describe('validateGoalName', () => {
  it('refuse vide et doublon (accents ignorés)', () => {
    const goals = [{ ...goal('a', 1000), name: 'Fonds d’urgence' }, { ...goal('b', 1000), name: 'Tabaski' }];
    expect(validateGoalName('  ', goals).ok).toBe(false);
    expect(validateGoalName('tabaski', goals).ok).toBe(false);
    expect(validateGoalName('Tabaski', goals, 'b')).toEqual({ ok: true, value: 'Tabaski' });
    expect(validateGoalName('  Voyage   Dakar ', goals)).toEqual({ ok: true, value: 'Voyage Dakar' });
  });
});

describe('sortGoals', () => {
  it('en cours d’abord, puis atteints, puis libres', () => {
    const goals = [goal('libre', null), goal('fait', 1000), goal('peu', 100000), goal('beaucoup', 10000)];
    const balances = new Map([['fait', 1000], ['peu', 1000], ['beaucoup', 9000]]);
    expect(sortGoals(goals, balances).map((g) => g.id)).toEqual(['beaucoup', 'peu', 'fait', 'libre']);
  });
});
