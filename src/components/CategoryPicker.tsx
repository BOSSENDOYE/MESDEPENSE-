import type { Category } from '../types';
import { FieldError } from './ui';

interface CategoryPickerProps {
  categories: readonly Category[];
  value: string;
  onChange: (categoryId: string) => void;
  error: string | null;
}

export function CategoryPicker({ categories, value, onChange, error }: CategoryPickerProps) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-slate-800 dark:text-slate-200">Catégorie</legend>
      <div className="mt-1 grid grid-cols-4 gap-2 sm:grid-cols-5">
        {categories.map((c) => {
          const selected = c.id === value;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(c.id)}
              className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl border-2 p-1 text-center text-xs font-medium leading-tight transition-colors ${
                selected
                  ? 'text-slate-900 dark:text-white'
                  : 'border-transparent bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
              style={selected ? { borderColor: c.color, backgroundColor: `${c.color}26` } : undefined}
            >
              <span aria-hidden="true" className="text-2xl">
                {c.icon}
              </span>
              <span className="line-clamp-2 break-words">{c.name}</span>
            </button>
          );
        })}
      </div>
      {error && <FieldError>{error}</FieldError>}
    </fieldset>
  );
}
