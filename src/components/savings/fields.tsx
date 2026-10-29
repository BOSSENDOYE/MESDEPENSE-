import type { ReactNode } from 'react';
import { todayISO, yesterdayISO } from '../../utils/dates';
import { Button, FieldError, inputClass, labelClass } from '../ui';

/** Pastille de suggestion sélectionnable (≥ 44 px de haut). */
export function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-11 rounded-full border-2 px-4 text-sm font-semibold ${
        selected
          ? 'border-emerald-700 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-100'
          : 'border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300'
      }`}
    >
      {children}
    </button>
  );
}

interface DateFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error: string | null;
}

/** Date avec raccourcis « Aujourd'hui » et « Hier ». */
export function DateField({ id, value, onChange, error }: DateFieldProps) {
  const today = todayISO();
  const yesterday = yesterdayISO();
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        Date
      </label>
      <div className="mt-1 flex gap-2">
        <input id={id} type="date" required value={value} max={today} onChange={(e) => onChange(e.target.value)} className={`${inputClass} flex-1`} />
        <Button variant={value === today ? 'primary' : 'secondary'} onClick={() => onChange(today)}>
          Auj.
        </Button>
        <Button variant={value === yesterday ? 'primary' : 'secondary'} onClick={() => onChange(yesterday)}>
          Hier
        </Button>
      </div>
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}
