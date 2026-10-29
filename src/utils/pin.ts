// Code PIN local : seul un hachage PBKDF2 salé est conservé, jamais le code lui-même.
// Le code protège l'accès à l'interface ; il ne chiffre pas les données d'IndexedDB.

export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 6;
export const PBKDF2_ITERATIONS = 150_000;
/** Nombre d'erreurs tolérées avant une attente imposée. */
export const FREE_ATTEMPTS = 4;

export interface PinConfig {
  version: 1;
  /** Sel aléatoire (hexadécimal). */
  salt: string;
  /** Empreinte PBKDF2-SHA-256 du code (hexadécimal). */
  hash: string;
  /** Nombre de chiffres du code (pour valider automatiquement la saisie). */
  length: number;
  iterations: number;
}

export function isPinConfig(value: unknown): value is PinConfig {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === 1 &&
    typeof v.salt === 'string' &&
    typeof v.hash === 'string' &&
    typeof v.length === 'number' &&
    v.length >= PIN_MIN_LENGTH &&
    v.length <= PIN_MAX_LENGTH &&
    typeof v.iterations === 'number' &&
    v.iterations > 0
  );
}

/** Vérifie un nouveau code ; renvoie un message d'erreur ou null. */
export function validateNewPin(pin: string): string | null {
  if (!/^\d*$/.test(pin)) return 'Le code ne doit contenir que des chiffres.';
  if (pin.length < PIN_MIN_LENGTH || pin.length > PIN_MAX_LENGTH) {
    return `Le code doit contenir entre ${PIN_MIN_LENGTH} et ${PIN_MAX_LENGTH} chiffres.`;
  }
  if (/^(\d)\1+$/.test(pin)) return 'Code trop simple : évitez un seul chiffre répété (ex. 0000).';
  if ('01234567890'.includes(pin) || '09876543210'.includes(pin)) {
    return 'Code trop simple : évitez une suite de chiffres (ex. 1234).';
  }
  return null;
}

/** Attente imposée (ms) après `failures` erreurs consécutives. */
export function lockoutDelayMs(failures: number): number {
  if (failures <= FREE_ATTEMPTS) return 0;
  const steps = [30_000, 60_000, 5 * 60_000];
  return steps[failures - FREE_ATTEMPTS - 1] ?? 15 * 60_000;
}

/** « 30 s », « 5 min » */
export function formatWait(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  return seconds < 60 ? `${seconds} s` : `${Math.ceil(seconds / 60)} min`;
}

export function isPinSupported(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle?.deriveBits === 'function';
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

/** Comparaison en temps constant (évite de révéler la position de la première différence). */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hashPin(pin: string, saltHex: string, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations },
    key,
    256,
  );
  return toHex(new Uint8Array(bits));
}

export async function createPinConfig(pin: string, iterations: number = PBKDF2_ITERATIONS): Promise<PinConfig> {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  return { version: 1, salt, hash: await hashPin(pin, salt, iterations), length: pin.length, iterations };
}

export async function verifyPin(pin: string, config: PinConfig): Promise<boolean> {
  return constantTimeEqual(await hashPin(pin, config.salt, config.iterations), config.hash);
}
