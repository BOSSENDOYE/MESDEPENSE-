import { useCallback, useEffect, useRef, useState } from 'react';
import { useLock } from '../../hooks/useLock';
import { useUserName } from '../../hooks/useUserName';
import { biometricName, isAppleDevice } from '../../utils/biometric';
import { formatLongDate, greetingFor, todayISO } from '../../utils/dates';
import { formatWait } from '../../utils/pin';
import { FaceIdIcon, FingerprintIcon } from '../Icons';
import { ForgotPinDialog } from './ForgotPinDialog';
import { LockLayout } from './LockLayout';
import { PinMessage, PinPad } from './PinPad';

/** Écran de connexion : Face ID / empreinte lancé automatiquement, code en secours. */
export function LockScreen() {
  const { unlock, pinLength, blockedUntil, biometricEnabled, unlockWithBiometric } = useLock();
  const [userName] = useUserName();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [retryAt, setRetryAt] = useState<number | null>(blockedUntil);
  const [now, setNow] = useState(Date.now());
  const [forgot, setForgot] = useState(false);
  const scanInProgress = useRef(false);

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

  /**
   * Lance Face ID / l'empreinte. En mode automatique, un échec reste silencieux
   * (ex. Safari qui exige un toucher) : l'icône du pavé permet de relancer.
   */
  const scan = useCallback(
    async (automatic: boolean) => {
      if (scanInProgress.current) return;
      scanInProgress.current = true;
      setScanning(true);
      if (!automatic) setError(null);
      const result = await unlockWithBiometric();
      scanInProgress.current = false;
      if (result.ok) return; // l'application s'affiche
      setScanning(false);
      if (!automatic) setError(result.error);
    },
    [unlockWithBiometric],
  );

  // Lancement automatique à l'affichage, et à chaque retour au premier plan.
  useEffect(() => {
    if (!biometricEnabled) return;
    void scan(true);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void scan(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [biometricEnabled, scan]);

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
  const apple = isAppleDevice();
  const BiometricIcon = apple ? FaceIdIcon : FingerprintIcon;
  const initial = userName.trim().charAt(0).toLocaleUpperCase('fr-FR');

  return (
    <LockLayout
      eyebrow={greetingFor(new Date())}
      title={userName || 'Mes Dépenses'}
      caption={formatLongDate(todayISO())}
      avatar={initial || undefined}
      footer={
        <button
          type="button"
          onClick={() => setForgot(true)}
          className="min-h-11 rounded-full px-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-slate-800"
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
        errorKey={errorKey}
        error={message !== null && value.length === 0 && errorKey > 0}
        message={
          message ? (
            <PinMessage kind="error">{message}</PinMessage>
          ) : scanning ? (
            <PinMessage kind="info">
              <span className="inline-flex items-center gap-2">
                <BiometricIcon width={18} height={18} className="animate-pulse" />
                {apple ? 'Face ID en cours…' : 'Posez votre doigt sur le capteur…'}
              </span>
            </PinMessage>
          ) : busy ? (
            <PinMessage kind="info">Vérification…</PinMessage>
          ) : null
        }
        sideKey={
          biometricEnabled
            ? {
                label: <BiometricIcon width={30} height={30} />,
                ariaLabel: `Déverrouiller avec ${biometricName()}`,
                onClick: () => void scan(false),
                // Reste utilisable pendant un blocage du code.
                disabled: busy || scanning,
              }
            : undefined
        }
      />
      {forgot && <ForgotPinDialog onClose={() => setForgot(false)} />}
    </LockLayout>
  );
}
