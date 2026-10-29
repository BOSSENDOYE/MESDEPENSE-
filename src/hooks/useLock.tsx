import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPinConfig, formatWait, FREE_ATTEMPTS, lockoutDelayMs, verifyPin, type PinConfig } from '../utils/pin';
import {
  clearPinConfig,
  getAutoLockSeconds,
  getPinAttempts,
  getPinConfig,
  getPinSkipped,
  setAutoLockSeconds as storeAutoLockSeconds,
  setPinAttempts,
  setPinConfig,
  setPinSkipped,
} from '../utils/storage';

/** setup = création du code au premier lancement ; locked = écran de déverrouillage. */
export type LockMode = 'setup' | 'locked' | 'unlocked';

export type PinCheck = { ok: true } | { ok: false; error: string; retryAt: number | null };

interface LockContextValue {
  mode: LockMode;
  pinLength: number | null;
  /** Vérifie le code (avec limite d'essais) sans changer l'état. */
  checkPin: (pin: string) => Promise<PinCheck>;
  /** Vérifie le code et déverrouille l'application. */
  unlock: (pin: string) => Promise<PinCheck>;
  lockNow: () => void;
  /** Crée ou remplace le code. */
  savePin: (pin: string) => Promise<void>;
  disablePin: () => void;
  /** « Plus tard » à l'écran de création. */
  skipSetup: () => void;
  autoLockSeconds: number;
  setAutoLockSeconds: (seconds: number) => void;
  /** Horodatage de fin de blocage en cours (ms), ou null. */
  blockedUntil: () => number | null;
}

const LockContext = createContext<LockContextValue | null>(null);

function initialMode(config: PinConfig | null): LockMode {
  if (config) return 'locked';
  return getPinSkipped() ? 'unlocked' : 'setup';
}

export function LockProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PinConfig | null>(getPinConfig);
  const [mode, setMode] = useState<LockMode>(() => initialMode(config));
  const [autoLockSeconds, setAutoLock] = useState(getAutoLockSeconds);

  // Verrouillage automatique après un passage en arrière-plan.
  useEffect(() => {
    if (!config) return;
    let hiddenAt: number | null = null;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
      } else if (hiddenAt !== null) {
        if (Date.now() - hiddenAt >= autoLockSeconds * 1000) setMode('locked');
        hiddenAt = null;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [config, autoLockSeconds]);

  const blockedUntil = useCallback(() => {
    const { lockUntil } = getPinAttempts();
    return lockUntil > Date.now() ? lockUntil : null;
  }, []);

  const checkPin = useCallback(
    async (pin: string): Promise<PinCheck> => {
      if (!config) return { ok: true };
      const attempts = getPinAttempts();
      if (attempts.lockUntil > Date.now()) {
        return {
          ok: false,
          error: `Trop d'essais. Réessayez dans ${formatWait(attempts.lockUntil - Date.now())}.`,
          retryAt: attempts.lockUntil,
        };
      }
      if (await verifyPin(pin, config)) {
        setPinAttempts({ failures: 0, lockUntil: 0 });
        return { ok: true };
      }
      const failures = attempts.failures + 1;
      const delay = lockoutDelayMs(failures);
      const lockUntil = delay > 0 ? Date.now() + delay : 0;
      setPinAttempts({ failures, lockUntil });
      if (delay > 0) {
        return { ok: false, error: `Code incorrect. Trop d'essais : patientez ${formatWait(delay)}.`, retryAt: lockUntil };
      }
      const left = FREE_ATTEMPTS + 1 - failures;
      return {
        ok: false,
        error: `Code incorrect. ${left} essai${left > 1 ? 's' : ''} avant un blocage temporaire.`,
        retryAt: null,
      };
    },
    [config],
  );

  const unlock = useCallback(
    async (pin: string) => {
      const result = await checkPin(pin);
      if (result.ok) setMode('unlocked');
      return result;
    },
    [checkPin],
  );

  const savePin = useCallback(async (pin: string) => {
    const next = await createPinConfig(pin);
    setPinConfig(next);
    setPinSkipped(false);
    setPinAttempts({ failures: 0, lockUntil: 0 });
    setConfig(next);
    setMode('unlocked');
  }, []);

  const disablePin = useCallback(() => {
    clearPinConfig();
    setPinSkipped(true);
    setConfig(null);
    setMode('unlocked');
  }, []);

  const skipSetup = useCallback(() => {
    setPinSkipped(true);
    setMode('unlocked');
  }, []);

  const lockNow = useCallback(() => {
    if (config) setMode('locked');
  }, [config]);

  const setAutoLockSeconds = useCallback((seconds: number) => {
    storeAutoLockSeconds(seconds);
    setAutoLock(seconds);
  }, []);

  const value = useMemo<LockContextValue>(
    () => ({
      mode,
      pinLength: config?.length ?? null,
      checkPin,
      unlock,
      lockNow,
      savePin,
      disablePin,
      skipSetup,
      autoLockSeconds,
      setAutoLockSeconds,
      blockedUntil,
    }),
    [mode, config, checkPin, unlock, lockNow, savePin, disablePin, skipSetup, autoLockSeconds, setAutoLockSeconds, blockedUntil],
  );

  return <LockContext.Provider value={value}>{children}</LockContext.Provider>;
}

export function useLock(): LockContextValue {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error('useLock doit être utilisé dans <LockProvider>.');
  return ctx;
}
