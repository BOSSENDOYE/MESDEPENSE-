import { describe, expect, it } from 'vitest';
import { biometricName, fromBase64Url, toBase64Url, userVerified } from './biometric';

describe('base64url', () => {
  it('fait un aller-retour pour toutes les longueurs', () => {
    for (let len = 0; len < 40; len++) {
      const bytes = Uint8Array.from({ length: len }, (_, i) => (i * 37 + 251) % 256);
      const encoded = toBase64Url(bytes);
      expect(encoded).not.toMatch(/[+/=]/);
      expect(fromBase64Url(encoded)).toEqual(bytes);
    }
  });
});

describe('userVerified', () => {
  function authData(flags: number): Uint8Array {
    const data = new Uint8Array(37);
    data[32] = flags;
    return data;
  }

  it('exige présence ET vérification de l’utilisateur', () => {
    expect(userVerified(authData(0x05))).toBe(true);
    expect(userVerified(authData(0x01))).toBe(false);
    expect(userVerified(authData(0x04))).toBe(false);
    expect(userVerified(new Uint8Array(10))).toBe(false);
  });
});

describe('biometricName', () => {
  it('adapte le nom à l’appareil', () => {
    expect(biometricName('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('Face ID / Touch ID');
    expect(biometricName('Mozilla/5.0 (Linux; Android 14; SM-A546B)')).toBe('votre empreinte digitale');
  });
});
