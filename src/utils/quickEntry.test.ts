import { describe, expect, it } from 'vitest';
import type { Category, SavingsGoal } from '../types';
import { DEFAULT_CATEGORIES } from './constants';
import { classifySegment, interpretMessage, parseQuickEntry, splitEntries, type MoneyEntry, type QuickEntry } from './quickEntry';

// Jeudi 29 octobre 2026
const TODAY = '2026-10-29';
const categories: Category[] = DEFAULT_CATEGORIES.map((c) =>
  c.id === 'autres' ? { ...c, subcategories: [{ id: 'ton', name: 'Tontine du quartier' }] } : { ...c },
);

function entry(text: string): QuickEntry {
  const result = parseQuickEntry(text, categories, TODAY);
  if (!result.ok) throw new Error(result.error);
  return result.entry;
}

describe('parseQuickEntry', () => {
  it('« taxi 2000 » → Transport · Taxi', () => {
    expect(entry('taxi 2000')).toMatchObject({
      amount: 2000,
      categoryId: 'transport',
      typeName: 'Taxi',
      paymentMethod: null,
      date: TODAY,
      note: '',
    });
  });

  it('montant avec espaces, moyen de paiement et « hier »', () => {
    expect(entry('Marché 4 500 wave hier')).toMatchObject({
      amount: 4500,
      categoryId: 'alimentation',
      typeName: 'Marché',
      paymentMethod: 'wave',
      date: '2026-10-28',
    });
  });

  it('formats de montant : 2k, 1,5k, 150.000, 2 mille, 3000f', () => {
    expect(entry('clando 2k om').amount).toBe(2000);
    expect(entry('clando 2k om').paymentMethod).toBe('orange_money');
    expect(entry('pain 1,5k').amount).toBe(1500);
    expect(entry('loyer 150.000').amount).toBe(150000);
    expect(entry('pharmacie 2 mille').amount).toBe(2000);
    expect(entry('crédit 3000f').amount).toBe(3000);
    expect(entry('woyofal 10 000 fcfa').amount).toBe(10000);
  });

  it('dates : le 5, le 30 (mois précédent), lundi, avant-hier, 12/10, 3 septembre', () => {
    expect(entry('loyer 150000 le 5').date).toBe('2026-10-05');
    expect(entry('loyer 150000 le 30').date).toBe('2026-09-30');
    expect(entry('restaurant 8000 lundi').date).toBe('2026-10-26');
    expect(entry('taxi 1500 avant-hier').date).toBe('2026-10-27');
    expect(entry('taxi 1500 avant hier').date).toBe('2026-10-27');
    expect(entry('école 25000 12/10').date).toBe('2026-10-12');
    expect(entry('école 25000 3 septembre').date).toBe('2026-09-03');
  });

  it('le jour du mois n’est pas pris pour le montant', () => {
    expect(entry('loyer le 5 150000')).toMatchObject({ amount: 150000, date: '2026-10-05' });
  });

  it('garde le reste comme note', () => {
    expect(entry('taxi 3000 pour aller à l’aéroport')).toMatchObject({
      typeName: 'Taxi',
      note: 'Aller l’aéroport'.replace('’', "'"),
    });
  });

  it('reconnaît un type créé par l’utilisateur', () => {
    expect(entry('tontine du quartier 5000')).toMatchObject({ categoryId: 'autres', typeName: 'Tontine du quartier' });
  });

  it('reconnaît le nom d’une catégorie', () => {
    expect(entry('santé 5000')).toMatchObject({ categoryId: 'sante', typeName: '' });
    expect(entry('transport taxi 2000')).toMatchObject({ categoryId: 'transport', typeName: 'Taxi', note: '' });
  });

  it('catégorie inconnue → null (l’assistant demandera)', () => {
    expect(entry('bijoux 15000')).toMatchObject({ categoryId: null, amount: 15000, note: 'Bijoux' });
  });

  it('erreur claire sans montant', () => {
    const result = parseQuickEntry('taxi', categories, TODAY);
    expect(result.ok).toBe(false);
  });
});

describe('splitEntries', () => {
  it('sépare plusieurs dépenses sans couper « 1,5k »', () => {
    expect(splitEntries('taxi 2000, pain 1,5k et crédit 1000\nloyer 150000')).toEqual([
      'taxi 2000',
      'pain 1,5k',
      'crédit 1000',
      'loyer 150000',
    ]);
  });
});

describe('interpretMessage', () => {
  it('reconnaît l’aide et le bilan', () => {
    expect(interpretMessage('aide', categories, TODAY).kind).toBe('help');
    expect(interpretMessage('Combien j’ai dépensé ce mois ?', categories, TODAY).kind).toBe('summary');
  });

  it('transforme un message en plusieurs dépenses', () => {
    const intent = interpretMessage('taxi 2000 et pain 500', categories, TODAY);
    expect(intent.kind).toBe('entries');
    if (intent.kind === 'entries') expect(intent.results.map((r) => r.ok && r.entry.amount)).toEqual([2000, 500]);
  });
});

describe('épargne et revenus', () => {
  const goals: SavingsGoal[] = [
    { id: 'tab', name: 'Tabaski', icon: '🐑', target: 150000, deadline: null, createdAt: '' },
    { id: 'urg', name: "Fonds d'urgence", icon: '🛟', target: null, deadline: null, createdAt: '' },
  ];
  const money = (text: string, list = goals): MoneyEntry => {
    const intent = interpretMessage(text, categories, TODAY, list);
    if (intent.kind !== 'entries') throw new Error(intent.kind);
    const result = intent.results[0];
    if (!result?.ok || result.kind !== 'money') throw new Error(`pas un mouvement : ${text}`);
    return result.entry;
  };

  it('reconnaît un versement et son objectif', () => {
    expect(money('épargne 5000 tabaski')).toMatchObject({ kind: 'saving', amount: 5000, goalId: 'tab', label: '' });
    expect(money("j'ai mis 10 000 de côté pour l'urgence hier")).toMatchObject({
      kind: 'saving',
      amount: 10000,
      goalId: 'urg',
      date: '2026-10-28',
    });
  });

  it('objectif inconnu : propose un nom ; un seul objectif : le choisit', () => {
    expect(money('épargne 20000 moto')).toMatchObject({ goalId: null, label: 'Moto' });
    expect(money('économie 3000', [goals[0]!])).toMatchObject({ goalId: 'tab' });
    expect(money('économie 3000')).toMatchObject({ goalId: null, label: '' });
  });

  it('retrait', () => {
    expect(money('retrait 2000 tabaski')).toMatchObject({ kind: 'withdrawal', amount: 2000, goalId: 'tab' });
  });

  it('revenus', () => {
    expect(money('salaire 250 000 virement')).toMatchObject({ kind: 'income', amount: 250000, label: 'Salaire', note: '' });
    expect(money('salaire 30000 prime')).toMatchObject({ label: 'Salaire', note: 'Prime' });
    expect(money("j'ai reçu 50k de papa")).toMatchObject({ kind: 'income', amount: 50000, label: 'Papa' });
  });

  it('une dépense reste une dépense', () => {
    expect(classifySegment('taxi 2000', goals)).toBe('expense');
    expect(classifySegment('retrait 5000', goals)).toBe('expense');
  });

  it('bilan d’épargne sans montant', () => {
    expect(interpretMessage("combien j'ai épargné ?", categories, TODAY, goals).kind).toBe('summary');
  });
});
