import { useState } from 'react';
import { isPinSupported, PIN_MAX_LENGTH, PIN_MIN_LENGTH, validateNewPin } from '../../utils/pin';
import { PinPad, type PinTone } from './PinPad';

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

  const brand = tone === 'brand';
  const muted = brand ? 'text-emerald-50' : 'text-slate-600 dark:text-slate-400';
  const errorClass = brand
    ? 'rounded-xl bg-red-950/40 px-3 py-2 text-white'
    : 'text-red-700 dark:text-red-400';

  if (!isPinSupported()) {
    return (
      <p role="alert" className={`text-center ${errorClass}`}>
        Le code nécessite une connexion sécurisée (adresse en https://). Ouvrez l'application depuis son adresse Netlify.
      </p>
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

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-center text-lg font-semibold">
        {step === 'enter' ? 'Choisissez votre code' : 'Confirmez votre code'}
      </p>
      <p className={`-mt-3 text-center text-sm ${muted}`}>
        {step === 'enter'
          ? `${PIN_MIN_LENGTH} à ${PIN_MAX_LENGTH} chiffres, facile à retenir pour vous seul.`
          : `Saisissez à nouveau les ${first.length} chiffres.`}
      </p>

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
      />

      <div className="min-h-12 w-full max-w-xs" aria-live="assertive">
        {error && (
          <p role="alert" className={`text-center text-sm font-medium ${errorClass}`}>
            {error}
          </p>
        )}
      </div>

      {step === 'enter' ? (
        <button
          type="button"
          onClick={continueToConfirm}
          disabled={value.length < PIN_MIN_LENGTH}
          className={`min-h-12 w-full max-w-xs rounded-2xl px-4 text-base font-semibold disabled:opacity-40 ${
            brand
              ? 'bg-white text-emerald-900 hover:bg-emerald-50'
              : 'bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-400 dark:text-slate-950'
          }`}
        >
          Continuer
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setStep('enter');
            setFirst('');
            setValue('');
            setError(null);
          }}
          disabled={busy}
          className={`min-h-11 text-sm font-semibold underline ${muted}`}
        >
          Recommencer
        </button>
      )}
    </div>
  );
}
