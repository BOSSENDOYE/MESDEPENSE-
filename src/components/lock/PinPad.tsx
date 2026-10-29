import { useEffect, useRef, type ReactNode } from 'react';
import { PIN_MAX_LENGTH, PIN_MIN_LENGTH } from '../../utils/pin';

export type PinTone = 'brand' | 'neutral';

/** Touche optionnelle en bas à gauche du pavé (ex. « OK », « Retour »). */
export interface PinSideKey {
  label: ReactNode;
  ariaLabel: string;
  onClick: () => void;
  /** Par défaut, suit l'état `disabled` du pavé. */
  disabled?: boolean;
}

interface PinPadProps {
  value: string;
  onChange: (value: string) => void;
  /** Longueur fixe : `onComplete` est appelé dès qu'elle est atteinte. null = longueur libre (4 à 6). */
  length: number | null;
  onComplete?: (pin: string) => void;
  /** Touche Entrée du clavier physique. */
  onSubmit?: () => void;
  disabled?: boolean;
  /** Texte lu par les lecteurs d'écran (ex. « Saisissez votre code »). */
  label: string;
  tone?: PinTone;
  /** Change à chaque erreur : secoue les points et fait vibrer le téléphone. */
  errorKey?: number;
  /** Les points sont affichés en rouge. */
  error?: boolean;
  /** Texte au-dessus des points (étape, consigne). */
  heading?: ReactNode;
  /** Message sous les points (erreur, aide). Zone de hauteur fixe pour éviter les sauts. */
  message?: ReactNode;
  sideKey?: PinSideKey;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

const TONES: Record<
  PinTone,
  { key: string; side: string; dotOn: string; dotOff: string; dotError: string; text: string; heading: string }
> = {
  brand: {
    key: 'bg-white/10 text-white ring-1 ring-inset ring-white/20 hover:bg-white/20 active:bg-white/30',
    side: 'text-white hover:bg-white/10 active:bg-white/20',
    dotOn: 'scale-110 border-white bg-white',
    dotOff: 'border-white/60',
    dotError: 'border-red-300 bg-red-300',
    text: 'text-white',
    heading: 'text-emerald-50',
  },
  neutral: {
    key: 'bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
    side: 'text-emerald-800 hover:bg-slate-100 dark:text-emerald-300 dark:hover:bg-slate-800',
    dotOn: 'scale-110 border-emerald-700 bg-emerald-700 dark:border-emerald-400 dark:bg-emerald-400',
    dotOff: 'border-slate-400 dark:border-slate-500',
    dotError: 'border-red-600 bg-red-600 dark:border-red-400 dark:bg-red-400',
    text: 'text-slate-900 dark:text-slate-100',
    heading: 'text-slate-600 dark:text-slate-400',
  },
};

// Touches carrées dont la taille s'adapte à la hauteur de l'écran (petits téléphones compris).
const KEY_SIZE = 'h-[clamp(3rem,8.5dvh,4.5rem)] w-[clamp(3rem,8.5dvh,4.5rem)]';

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
  error = false,
  heading,
  message,
  sideKey,
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

  // Retour haptique sur erreur (Android ; ignoré ailleurs).
  useEffect(() => {
    if (errorKey > 0) navigator.vibrate?.(180);
  }, [errorKey]);

  const dots = length ?? Math.max(PIN_MIN_LENGTH, Math.min(PIN_MAX_LENGTH, value.length + 1));
  const keyClass = `flex ${KEY_SIZE} select-none items-center justify-center rounded-full text-[1.7rem] font-medium tabular-nums transition active:scale-95 disabled:opacity-40 ${styles.key}`;
  const sideClass = `flex ${KEY_SIZE} select-none items-center justify-center rounded-full text-base font-semibold transition active:scale-95 disabled:opacity-30 ${styles.side}`;

  return (
    <div className="flex w-full flex-1 flex-col items-center">
      {/* Zone supérieure : consigne, points, message — centrée dans l'espace disponible. */}
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 py-2">
        {heading && <div className={`text-center text-sm font-medium ${styles.heading}`}>{heading}</div>}
        <div key={errorKey} className={`flex gap-5 ${errorKey > 0 ? 'animate-shake' : ''}`} aria-hidden="true">
          {Array.from({ length: dots }, (_, i) => (
            <span
              key={i}
              className={`h-3.5 w-3.5 rounded-full border-2 transition-all duration-150 ${
                error ? styles.dotError : i < value.length ? styles.dotOn : styles.dotOff
              }`}
            />
          ))}
        </div>
        <p className="sr-only" aria-live="polite">
          {label}. {value.length} chiffre{value.length > 1 ? 's' : ''} saisi{value.length > 1 ? 's' : ''}
          {length ? ` sur ${length}` : ''}.
        </p>
        <div className="flex min-h-[2.75rem] w-full items-start justify-center" aria-live="assertive">
          {message}
        </div>
      </div>

      {/* Pavé, ancré en bas pour être à portée du pouce. */}
      <div className={`grid grid-cols-3 gap-x-[clamp(1rem,6vw,1.75rem)] gap-y-[clamp(0.5rem,1.6dvh,1rem)] ${styles.text}`}>
        {KEYS.map((k) => (
          <button key={k} type="button" className={keyClass} onClick={() => press(k)} disabled={disabled} aria-label={k}>
            {k}
          </button>
        ))}
        {sideKey ? (
          <button
            type="button"
            className={sideClass}
            onClick={sideKey.onClick}
            disabled={sideKey.disabled ?? disabled}
            aria-label={sideKey.ariaLabel}
          >
            {sideKey.label}
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
        <button type="button" className={keyClass} onClick={() => press('0')} disabled={disabled} aria-label="0">
          0
        </button>
        <button
          type="button"
          className={sideClass}
          onClick={erase}
          disabled={disabled || value.length === 0}
          aria-label="Effacer le dernier chiffre"
        >
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z" />
            <path d="m17 9-6 6M11 9l6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/** Message d'erreur ou d'aide sous les points. */
export function PinMessage({ children, tone, kind }: { children: ReactNode; tone: PinTone; kind: 'error' | 'info' }) {
  const styles =
    tone === 'brand'
      ? kind === 'error'
        ? 'bg-red-500/25 text-white ring-1 ring-inset ring-red-200/40'
        : 'bg-white/10 text-emerald-50'
      : kind === 'error'
        ? 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  return (
    <p role={kind === 'error' ? 'alert' : undefined} className={`max-w-xs rounded-2xl px-3 py-2 text-center text-sm font-medium ${styles}`}>
      {kind === 'error' && <span aria-hidden="true">⚠️ </span>}
      {children}
    </p>
  );
}
