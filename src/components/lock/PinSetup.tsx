import { useState } from 'react';
import { isPinSupported, PIN_MAX_LENGTH, PIN_MIN_LENGTH, validateNewPin } from '../../utils/pin';
import { PinMessage, PinPad, type PinTone } from './PinPad';

interface PinSetupProps {
  /** Enregistre le code confirmé. */
  onDone: (pin: string) => Promise<void>;
  tone?: PinTone;
}

/** Création d'un code en deux étapes : saisie puis confirmation. */
export function PinSetup({ onDone, tone = 'neutral' }: PinSetupProps) {
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [first, setFirst] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [busy, setBusy] = useState(false);

  if (!isPinSupported()) {
    return (
      <div className="flex flex-1 items-center">
        <PinMessage tone={tone} kind="error">
          Le code nécessite une connexion sécurisée (adresse en https://). Ouvrez l'application depuis son adresse Netlify.
        </PinMessage>
      </div>
    );
  }

  function fail(message: string) {
    setError(message);
    setErrorKey((k) => k + 1);
    setValue('');
  }

  function continueToConfirm() {
    const problem = validateNewPin(value);
    if (problem) {
      fail(problem);
      return;
    }
    setFirst(value);
    setValue('');
    setError(null);
    setStep('confirm');
  }

  function restart() {
    setStep('enter');
    setFirst('');
    setValue('');
    setError(null);
  }

  async function confirm(pin: string) {
    if (pin !== first) {
      setStep('enter');
      setFirst('');
      fail('Les deux codes ne correspondent pas. Recommencez.');
      return;
    }
    setBusy(true);
    try {
      await onDone(pin);
    } catch (err) {
      console.error(err);
      setBusy(false);
      fail("Le code n'a pas pu être enregistré. Réessayez.");
    }
  }

  const heading =
    step === 'enter' ? (
      <>
        <span className="block text-xs font-semibold uppercase tracking-widest opacity-80">Étape 1 sur 2</span>
        Choisissez un code de {PIN_MIN_LENGTH} à {PIN_MAX_LENGTH} chiffres
      </>
    ) : (
      <>
        <span className="block text-xs font-semibold uppercase tracking-widest opacity-80">Étape 2 sur 2</span>
        Retapez votre code pour confirmer
      </>
    );

  const hint =
    step === 'enter' && value.length >= PIN_MIN_LENGTH ? (
      <PinMessage tone={tone} kind="info">
        Appuyez sur OK pour continuer
      </PinMessage>
    ) : null;

  return (
    <PinPad
      key={step}
      value={value}
      onChange={(v) => {
        setValue(v);
        if (error) setError(null);
      }}
      length={step === 'confirm' ? first.length : null}
      onComplete={(pin) => void confirm(pin)}
      onSubmit={step === 'enter' ? continueToConfirm : undefined}
      disabled={busy}
      label={step === 'enter' ? 'Choisissez votre code' : 'Confirmez votre code'}
      tone={tone}
      errorKey={errorKey}
      error={error !== null && value.length === 0}
      heading={heading}
      message={
        error ? (
          <PinMessage tone={tone} kind="error">
            {error}
          </PinMessage>
        ) : busy ? (
          <PinMessage tone={tone} kind="info">
            Enregistrement…
          </PinMessage>
        ) : (
          hint
        )
      }
      sideKey={
        step === 'enter'
          ? {
              label: 'OK',
              ariaLabel: 'Valider le code',
              onClick: continueToConfirm,
              disabled: busy || value.length < PIN_MIN_LENGTH,
            }
          : { label: 'Retour', ariaLabel: 'Revenir au choix du code', onClick: restart, disabled: busy }
      }
    />
  );
}
