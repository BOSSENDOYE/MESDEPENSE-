import { describe, expect, it } from 'vitest';
import type { AppDataSnapshot } from '../types';
import { createBackup, parseBackup } from './backup';
import { expensesToCsv, moneyToCsv } from './csv';

const snapshot: AppDataSnapshot = {
  categories: [
    {
      id: 'alimentation',
      name: 'Alimentation',
      color: '#16a34a',
      icon: '🍚',
      order: 0,
      subcategories: [{ id: 'pain', name: 'Boulangerie' }],
    },
  ],
  expenses: [
    {
      id: 'a',
      amount: 2500,
      categoryId: 'alimentation',
      date: '2026-10-01',
      paymentMethod: 'wave',
      note: 'Pain; "frais"',
      subcategoryId: 'pain',
      createdAt: '2026-10-01T08:00:00.000Z',
    },
  ],
  budgets: [{ categoryId: 'alimentation', monthlyLimit: 50000 }],
  recurring: [],
  totalBudget: 100000,
  savingsBudget: 10000,
  goals: [
    {
      id: 'tabaski',
      name: 'Tabaski',
      icon: '🐑',
      target: 150000,
      deadline: '2027-05',
      createdAt: '2026-09-01T08:00:00.000Z',
      auto: { amount: 10000, dayOfMonth: 1, active: true, lastRunMonth: '2026-10' },
    },
  ],
  movements: [
    { id: 'm1', goalId: 'tabaski', amount: 10000, date: '2026-10-01', note: '', createdAt: '2026-10-01T08:00:00.000Z', auto: true },
    { id: 'm2', goalId: 'tabaski', amount: -2000, date: '2026-10-03', note: 'Urgence', createdAt: '2026-10-03T08:00:00.000Z' },
  ],
  incomes: [{ id: 'r1', amount: 250000, date: '2026-10-01', source: 'Salaire', note: '', createdAt: '2026-10-01T08:00:00.000Z' }],
};

describe('sauvegarde JSON', () => {
  it('fait un aller-retour sans perte', () => {
    const json: unknown = JSON.parse(JSON.stringify(createBackup(snapshot)));
    expect(parseBackup(json)).toEqual({ ok: true, value: snapshot });
  });

  it('refuse un fichier étranger', () => {
    expect(parseBackup({ foo: 1 }).ok).toBe(false);
    expect(parseBackup(null).ok).toBe(false);
  });

  it('refuse un montant non entier avec un message précis', () => {
    const bad = createBackup({ ...snapshot, expenses: [{ ...snapshot.expenses[0]!, amount: 12.5 }] });
    const result = parseBackup(JSON.parse(JSON.stringify(bad)));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Dépense n° 1');
  });

  it('refuse une catégorie inconnue', () => {
    const bad = createBackup({ ...snapshot, budgets: [{ categoryId: 'inconnue', monthlyLimit: 10 }] });
    expect(parseBackup(JSON.parse(JSON.stringify(bad))).ok).toBe(false);
  });
});

it('accepte une ancienne sauvegarde sans budget total', () => {
  const { totalBudget: _ignored, ...ancienne } = createBackup(snapshot);
  const result = parseBackup(JSON.parse(JSON.stringify(ancienne)));
  expect(result.ok && result.value.totalBudget).toBe(null);
});

it('accepte une ancienne sauvegarde sans épargne ni revenus', () => {
  const { goals: _g, movements: _m, incomes: _i, savingsBudget: _s, ...ancienne } = createBackup(snapshot);
  const result = parseBackup(JSON.parse(JSON.stringify(ancienne)));
  expect(result.ok && result.value).toMatchObject({ goals: [], movements: [], incomes: [], savingsBudget: null });
});

it('refuse un versement vers un objectif inconnu', () => {
  const bad = createBackup({ ...snapshot, movements: [{ ...snapshot.movements[0]!, goalId: 'inconnu' }] });
  expect(parseBackup(JSON.parse(JSON.stringify(bad))).ok).toBe(false);
});

describe('export CSV', () => {
  it('revenus et épargne dans un seul fichier', () => {
    expect(moneyToCsv(snapshot.incomes, snapshot.movements, snapshot.goals).split('\r\n')).toEqual([
      'Date;Opération;Montant (FCFA);Libellé;Note',
      '2026-10-01;Revenu;250000;Salaire;',
      '2026-10-01;Versement épargne;10000;Tabaski;Versement automatique',
      '2026-10-03;Retrait épargne;2000;Tabaski;Urgence',
    ]);
  });

  it('utilise le point-virgule et échappe les guillemets', () => {
    const csv = expensesToCsv(snapshot.expenses, snapshot.categories);
    expect(csv.split('\r\n')).toEqual([
      'Date;Montant (FCFA);Catégorie;Type;Moyen de paiement;Note',
      '2026-10-01;2500;Alimentation;Boulangerie;Wave;"Pain; ""frais"""',
    ]);
  });

  it('neutralise les formules Excel', () => {
    const csv = expensesToCsv([{ ...snapshot.expenses[0]!, note: '=SOMME(A1)' }], snapshot.categories);
    expect(csv).toContain("'=SOMME(A1)");
  });
});
