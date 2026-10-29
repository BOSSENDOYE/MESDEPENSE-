import { useEffect, useState } from 'react';
import { useLock } from '../../hooks/useLock';
import { formatWait } from '../../utils/pin';
import { ForgotPinDialog } from './ForgotPinDialog';
import { LockLayout } from './LockLayout';
import { PinPad } from './PinPad';

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

  return (
    <LockLayout
      title="Mes Dépenses"
      subtitle={blocked ? 'Saisie temporairement bloquée' : 'Entrez votre code pour continuer'}
      footer={
        <button type="button" onClick={() => setForgot(true)} className="min-h-11 px-3 text-sm font-semibold text-emerald-50 underline">
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
      />
      <div className="mt-6 min-h-12" aria-live="assertive">
        {error && (
          <p role="alert" className="rounded-xl bg-red-950/40 px-3 py-2 text-center text-sm font-medium">
            {blocked && retryAt !== null ? `Trop d'essais. Réessayez dans ${formatWait(retryAt - now)}.` : error}
          </p>
        )}
      </div>
      {forgot && <ForgotPinDialog onClose={() => setForgot(false)} />}
    </LockLayout>
  );
}
