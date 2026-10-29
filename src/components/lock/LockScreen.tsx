import { useEffect, useState } from 'react';
import { useLock } from '../../hooks/useLock';
import { formatLongDate, greetingFor, todayISO } from '../../utils/dates';
import { formatWait } from '../../utils/pin';
import { ForgotPinDialog } from './ForgotPinDialog';
import { LockLayout } from './LockLayout';
import { PinMessage, PinPad } from './PinPad';

/** Écran de connexion : déverrouillage par code. */
export function LockScreen() {
  const { unlock, pinLength, blockedUntil } = useLock();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [retryAt, setRetryAt] = useState<number | null>(blockedUntil);
  const [now, setNow] = useState(Date.now());
  const [forgot, setForgot] = useState(false);

  // Compte à rebours pendant un blocage temporaire.
  useEffect(() => {
    if (retryAt === null) return;
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= retryAt) {
        setRetryAt(null);
        setError(null);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [retryAt]);

  async function submit(pin: string) {
    setBusy(true);
    const result = await unlock(pin);
    if (result.ok) return; // l'application s'affiche
    setBusy(false);
    setValue('');
    setError(result.error);
    setErrorKey((k) => k + 1);
    setRetryAt(result.retryAt);
    setNow(Date.now());
  }

  const blocked = retryAt !== null && now < retryAt;
  const message = blocked && retryAt !== null ? `Trop d'essais. Réessayez dans ${formatWait(retryAt - now)}.` : error;

  return (
    <LockLayout
      eyebrow={`${greetingFor(new Date())} 👋 · ${formatLongDate(todayISO())}`}
      title="Mes Dépenses"
      subtitle={blocked ? 'Saisie temporairement bloquée' : 'Entrez votre code secret'}
      footer={
        <button
          type="button"
          onClick={() => setForgot(true)}
          className="min-h-11 rounded-full px-4 text-sm font-semibold text-emerald-50 hover:bg-white/10"
        >
          Code oublié ?
        </button>
      }
    >
      <PinPad
        value={value}
        onChange={(v) => {
          setValue(v);
          if (error && !blocked) setError(null);
        }}
        length={pinLength}
        onComplete={(pin) => void submit(pin)}
        disabled={busy || blocked}
        label="Entrez votre code"
        tone="brand"
        errorKey={errorKey}
        error={message !== null && value.length === 0}
        message={
          message ? (
            <PinMessage tone="brand" kind="error">
              {message}
            </PinMessage>
          ) : busy ? (
            <PinMessage tone="brand" kind="info">
              Vérification…
            </PinMessage>
          ) : null
        }
      />
      {forgot && <ForgotPinDialog onClose={() => setForgot(false)} />}
    </LockLayout>
  );
}
