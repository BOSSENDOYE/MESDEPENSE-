import { useEffect, useRef } from 'react';
import { PIN_MAX_LENGTH, PIN_MIN_LENGTH } from '../../utils/pin';

export type PinTone = 'brand' | 'neutral';

interface PinPadProps {
  value: string;
  onChange: (value: string) => void;
  /** Longueur fixe : `onComplete` est appelé dès qu'elle est atteinte. null = longueur libre (4 à 6). */
  length: number | null;
  onComplete?: (pin: string) => void;
  /** Touche Entrée en longueur libre. */
  onSubmit?: () => void;
  disabled?: boolean;
  /** Texte lu par les lecteurs d'écran (ex. « Saisissez votre code »). */
  label: string;
  tone?: PinTone;
  /** Change à chaque erreur pour déclencher l'animation. */
  errorKey?: number;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

const TONES: Record<PinTone, { key: string; dotOn: string; dotOff: string; text: string }> = {
  brand: {
    key: 'bg-white/15 text-white hover:bg-white/25 active:bg-white/35',
    dotOn: 'bg-white border-white',
    dotOff: 'border-white/70',
    text: 'text-white',
  },
  neutral: {
    key: 'bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
    dotOn: 'bg-emerald-700 border-emerald-700 dark:bg-emerald-400 dark:border-emerald-400',
    dotOff: 'border-slate-400 dark:border-slate-500',
    text: 'text-slate-900 dark:text-slate-100',
  },
};

/** Pavé numérique de saisie du code (tactile + clavier physique). */
export function PinPad({
  value,
  onChange,
  length,
  onComplete,
  onSubmit,
  disabled = false,
  label,
  tone = 'neutral',
  errorKey = 0,
}: PinPadProps) {
  const max = length ?? PIN_MAX_LENGTH;
  const styles = TONES[tone];
  const latest = useRef({ value, onChange, onComplete, onSubmit, disabled, max, length });
  latest.current = { value, onChange, onComplete, onSubmit, disabled, max, length };

  function press(digit: string) {
    const { value: current, max: limit, length: fixed } = latest.current;
    if (latest.current.disabled || current.length >= limit) return;
    const next = current + digit;
    latest.current.onChange(next);
    if (fixed !== null && next.length === fixed) latest.current.onComplete?.(next);
  }

  function erase() {
    if (latest.current.disabled) return;
    latest.current.onChange(latest.current.value.slice(0, -1));
  }

  // Clavier physique (ordinateur, clavier Bluetooth).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') erase();
      else if (e.key === 'Enter') latest.current.onSubmit?.();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const dots = length ?? Math.max(PIN_MIN_LENGTH, Math.min(PIN_MAX_LENGTH, value.length + 1));
  const keyClass = `flex h-16 w-16 items-center justify-center rounded-full text-2xl font-semibold transition-colors disabled:opacity-40 ${styles.key}`;

  return (
    <div className="flex flex-col items-center gap-6">
      <div key={errorKey} className={`flex gap-4 ${errorKey > 0 ? 'animate-shake' : ''}`} aria-hidden="true">
        {Array.from({ length: dots }, (_, i) => (
          <span
            key={i}
            className={`h-4 w-4 rounded-full border-2 transition-colors ${i < value.length ? styles.dotOn : styles.dotOff}`}
          />
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {label}. {value.length} chiffre{value.length > 1 ? 's' : ''} saisi{value.length > 1 ? 's' : ''}
        {length ? ` sur ${length}` : ''}.
      </p>

      <div className={`grid grid-cols-3 gap-x-6 gap-y-4 ${styles.text}`}>
        {KEYS.map((k) => (
          <button key={k} type="button" className={keyClass} onClick={() => press(k)} disabled={disabled} aria-label={k}>
            {k}
          </button>
        ))}
        <span aria-hidden="true" />
        <button type="button" className={keyClass} onClick={() => press('0')} disabled={disabled} aria-label="0">
          0
        </button>
        <button
          type="button"
          className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl disabled:opacity-40 ${styles.text}`}
          onClick={erase}
          disabled={disabled || value.length === 0}
          aria-label="Effacer le dernier chiffre"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
