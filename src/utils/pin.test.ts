import { describe, expect, it } from 'vitest';
import { createPinConfig, formatWait, isPinConfig, lockoutDelayMs, validateNewPin, verifyPin } from './pin';

describe('validateNewPin', () => {
  it('accepte 4 à 6 chiffres', () => {
    expect(validateNewPin('2580')).toBeNull();
    expect(validateNewPin('739214')).toBeNull();
  });

  it('refuse les codes trop courts, trop longs ou non numériques', () => {
    expect(validateNewPin('258')).not.toBeNull();
    expect(validateNewPin('1234567')).not.toBeNull();
    expect(validateNewPin('12a4')).not.toBeNull();
  });

  it('refuse les codes trop simples', () => {
    expect(validateNewPin('0000')).not.toBeNull();
    expect(validateNewPin('1234')).not.toBeNull();
    expect(validateNewPin('987654')).not.toBeNull();
  });
});

describe('blocage après erreurs', () => {
  it('laisse 4 essais libres puis impose une attente croissante', () => {
    expect(lockoutDelayMs(4)).toBe(0);
    expect(lockoutDelayMs(5)).toBe(30_000);
    expect(lockoutDelayMs(6)).toBe(60_000);
    expect(lockoutDelayMs(7)).toBe(300_000);
    expect(lockoutDelayMs(20)).toBe(900_000);
  });

  it('formate l’attente', () => {
    expect(formatWait(30_000)).toBe('30 s');
    expect(formatWait(300_000)).toBe('5 min');
  });
});

describe('hachage du code', () => {
  it('vérifie le bon code et refuse un mauvais, sans stocker le code', async () => {
    const config = await createPinConfig('2580', 1000);
    expect(isPinConfig(config)).toBe(true);
    expect(config.length).toBe(4);
    expect(JSON.stringify(config)).not.toContain('2580');
    expect(await verifyPin('2580', config)).toBe(true);
    expect(await verifyPin('2581', config)).toBe(false);
  });

  it('utilise un sel différent à chaque création', async () => {
    const a = await createPinConfig('2580', 1000);
    const b = await createPinConfig('2580', 1000);
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });
});
