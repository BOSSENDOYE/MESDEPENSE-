import { describe, expect, it } from 'vitest';
import { dueOccurrences, initialLastRunMonth, nextOccurrence, occurrenceDate } from './recurring';

describe('occurrenceDate', () => {
  it('ramène au dernier jour des mois courts', () => {
    expect(occurrenceDate('2026-02', 31)).toBe('2026-02-28');
    expect(occurrenceDate('2026-04', 31)).toBe('2026-04-30');
    expect(occurrenceDate('2026-10', 5)).toBe('2026-10-05');
  });
});

describe('initialLastRunMonth', () => {
  it('ne crée pas de dépense rétroactive si le jour est passé', () => {
    expect(initialLastRunMonth(5, '2026-10-29')).toBe('2026-10');
  });
  it('crée la dépense ce mois-ci si le jour est aujourd’hui ou à venir', () => {
    expect(initialLastRunMonth(29, '2026-10-29')).toBe('2026-09');
    expect(initialLastRunMonth(30, '2026-10-29')).toBe('2026-09');
  });
});

describe('dueOccurrences', () => {
  const rule = { active: true, dayOfMonth: 5, lastRunMonth: '2026-09' };

  it('rien avant la date prévue', () => {
    expect(dueOccurrences(rule, '2026-10-04')).toEqual([]);
  });

  it('crée le jour J', () => {
    expect(dueOccurrences(rule, '2026-10-05')).toEqual(['2026-10-05']);
  });

  it('rattrape les mois manqués', () => {
    expect(dueOccurrences({ ...rule, lastRunMonth: '2026-07' }, '2026-10-29')).toEqual([
      '2026-08-05',
      '2026-09-05',
      '2026-10-05',
    ]);
  });

  it('ne crée rien si déjà traité ce mois', () => {
    expect(dueOccurrences({ ...rule, lastRunMonth: '2026-10' }, '2026-10-29')).toEqual([]);
  });

  it('ignore une récurrence en pause', () => {
    expect(dueOccurrences({ ...rule, active: false }, '2026-10-29')).toEqual([]);
  });

  it('passe le changement d’année', () => {
    expect(dueOccurrences({ ...rule, lastRunMonth: '2026-12' }, '2027-01-10')).toEqual(['2027-01-05']);
  });
});

describe('nextOccurrence', () => {
  it('donne la prochaine date', () => {
    expect(nextOccurrence({ dayOfMonth: 31, lastRunMonth: '2027-01' })).toBe('2027-02-28');
  });
});
