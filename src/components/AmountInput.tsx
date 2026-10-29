import type { KeyboardEventHandler, Ref } from 'react';
import { formatFCFA, validateAmount } from '../utils/money';
import { FieldError, labelClass, mutedText } from './ui';

interface AmountInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Erreur à afficher (après tentative d'envoi). */
  error: string | null;
  inputRef?: Ref<HTMLInputElement>;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
}

export function AmountInput({ id, label, value, onChange, error, inputRef, onKeyDown }: AmountInputProps) {
  const errorId = `${id}-erreur`;
  const check = validateAmount(value);
  // Feedback immédiat si un caractère non autorisé est saisi.
  const shownError = error ?? (value.trim() !== '' && !check.ok ? check.error : null);

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div
        className={`mt-1 flex items-baseline gap-2 rounded-2xl border-2 bg-white px-4 py-2 focus-within:border-emerald-700 dark:bg-slate-950 dark:focus-within:border-emerald-400 ${
          shownError ? 'border-red-600 dark:border-red-400' : 'border-slate-300 dark:border-slate-700'
        }`}
      >
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9 ]*"
          autoComplete="off"
          enterKeyHint="done"
          maxLength={14}
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          aria-invalid={shownError ? true : undefined}
          aria-describedby={shownError ? errorId : undefined}
          className="w-full min-w-0 bg-transparent text-4xl font-bold tabular-nums outline-none placeholder:text-slate-400"
        />
        <span className={`text-lg font-semibold ${mutedText}`}>FCFA</span>
      </div>
      {shownError ? (
        <FieldError id={errorId}>{shownError}</FieldError>
      ) : (
        check.ok && <p className={`mt-1 text-sm ${mutedText}`}>{formatFCFA(check.value)}</p>
      )}
    </div>
  );
}
