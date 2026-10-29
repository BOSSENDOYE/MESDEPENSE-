import { useEffect, useRef, useState } from 'react';
import { useLock } from '../../hooks/useLock';
import { greetingLine, useUserName } from '../../hooks/useUserName';
import { biometricName, isAppleDevice } from '../../utils/biometric';
import { formatLongDate, todayISO } from '../../utils/dates';
import { formatWait } from '../../utils/pin';
import { FaceIdIcon, FingerprintIcon } from '../Icons';
import { ForgotPinDialog } from './ForgotPinDialog';
import { LockLayout } from './LockLayout';
import { PinMessage, PinPad } from './PinPad';

/** Écran de connexion : déverrouillage par code ou Face ID / empreinte. */
export function LockScreen() {
  const { unlock, pinLength, blockedUntil, biometricEnabled, unlockWithBiometric } = useLock();
  const [userName] = useUserName();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [retryAt, setRetryAt] = useState<number | null>(blockedUntil);
  const [now, setNow] = useState(Date.now());
  const [forgot, setForgot] = useState(false);
  const autoTried = useRef(false);

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

  async function tryBiometric() {
    setBusy(true);
    setError(null);
    const result = await unlockWithBiometric();
    if (result.ok) return; // l'application s'affiche
    setBusy(false);
    setError(result.error);
  }

  // Android : la demande d'empreinte s'ouvre directement. iPhone : Safari exige un toucher sur le bouton.
  useEffect(() => {
    if (!biometricEnabled || autoTried.current || isAppleDevice()) return;
    autoTried.current = true;
    void tryBiometric();
  }, [biometricEnabled]);

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
  const BiometricIcon = isAppleDevice() ? FaceIdIcon : FingerprintIcon;

  return (
    <LockLayout
      eyebrow={`${greetingLine(userName)} · ${formatLongDate(todayISO())}`}
      title="Mes Dépenses"
      subtitle={
        blocked
          ? 'Saisie du code temporairement bloquée'
          : biometricEnabled
            ? `Utilisez ${biometricName()} ou votre code`
            : 'Entrez votre code secret'
      }
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
        error={message !== null && value.length === 0 && errorKey > 0}
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
        sideKey={
          biometricEnabled
            ? {
                label: <BiometricIcon width={30} height={30} />,
                ariaLabel: `Déverrouiller avec ${biometricName()}`,
                onClick: () => void tryBiometric(),
                // Reste utilisable pendant un blocage du code.
                disabled: busy,
              }
            : undefined
        }
      />
      {forgot && <ForgotPinDialog onClose={() => setForgot(false)} />}
    </LockLayout>
  );
}
