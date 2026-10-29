import type { PaymentMethod } from '../types';
import { PAYMENT_METHODS } from '../utils/constants';

interface PaymentMethodPickerProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

export function PaymentMethodPicker({ value, onChange }: PaymentMethodPickerProps) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-slate-800 dark:text-slate-200">Moyen de paiement</legend>
      <div className="mt-1 flex flex-wrap gap-2">
        {PAYMENT_METHODS.map((m) => {
          const selected = m.id === value;
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(m.id)}
              className={`min-h-11 rounded-full border-2 px-4 text-sm font-semibold transition-colors ${
                selected
                  ? 'border-emerald-700 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-100'
                  : 'border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
