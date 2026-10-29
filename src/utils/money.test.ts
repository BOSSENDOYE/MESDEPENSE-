import { describe, expect, it } from 'vitest';
import { formatCompact, formatFCFA, validateAmount } from './money';

const NBSP = ' ';

describe('formatFCFA', () => {
  it('formate avec des espaces insécables', () => {
    expect(formatFCFA(12500)).toBe(`12${NBSP}500${NBSP}FCFA`);
    expect(formatFCFA(1250000)).toBe(`1${NBSP}250${NBSP}000${NBSP}FCFA`);
    expect(formatFCFA(0)).toBe(`0${NBSP}FCFA`);
    expect(formatFCFA(500)).toBe(`500${NBSP}FCFA`);
  });
});

describe('formatCompact', () => {
  it('abrège en k et M', () => {
    expect(formatCompact(800)).toBe('800');
    expect(formatCompact(12500)).toBe(`12,5${NBSP}k`);
    expect(formatCompact(2000000)).toBe(`2${NBSP}M`);
  });
});

describe('validateAmount', () => {
  it('accepte un entier positif, avec ou sans espaces', () => {
    expect(validateAmount('12500')).toEqual({ ok: true, value: 12500 });
    expect(validateAmount('12 500')).toEqual({ ok: true, value: 12500 });
  });

  it('refuse vide, zéro, décimales et texte', () => {
    expect(validateAmount('').ok).toBe(false);
    expect(validateAmount('0').ok).toBe(false);
    expect(validateAmount('12,5').ok).toBe(false);
    expect(validateAmount('12.5').ok).toBe(false);
    expect(validateAmount('-500').ok).toBe(false);
    expect(validateAmount('abc').ok).toBe(false);
  });

  it('refuse les montants démesurés', () => {
    expect(validateAmount('99999999999').ok).toBe(false);
  });
});
