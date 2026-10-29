import { describe, expect, it } from 'vitest';
import type { AppDataSnapshot } from '../types';
import { createBackup, parseBackup } from './backup';
import { expensesToCsv } from './csv';

const snapshot: AppDataSnapshot = {
  categories: [{ id: 'alimentation', name: 'Alimentation', color: '#16a34a', icon: '🍚', order: 0 }],
  expenses: [
    {
      id: 'a',
      amount: 2500,
      categoryId: 'alimentation',
      date: '2026-10-01',
      paymentMethod: 'wave',
      note: 'Pain; "frais"',
      createdAt: '2026-10-01T08:00:00.000Z',
    },
  ],
  budgets: [{ categoryId: 'alimentation', monthlyLimit: 50000 }],
  recurring: [],
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

describe('export CSV', () => {
  it('utilise le point-virgule et échappe les guillemets', () => {
    const csv = expensesToCsv(snapshot.expenses, snapshot.categories);
    expect(csv.split('\r\n')).toEqual([
      'Date;Montant (FCFA);Catégorie;Moyen de paiement;Note',
      '2026-10-01;2500;Alimentation;Wave;"Pain; ""frais"""',
    ]);
  });

  it('neutralise les formules Excel', () => {
    const csv = expensesToCsv([{ ...snapshot.expenses[0]!, note: '=SOMME(A1)' }], snapshot.categories);
    expect(csv).toContain("'=SOMME(A1)");
  });
});
