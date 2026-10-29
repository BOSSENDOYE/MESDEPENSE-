import type { Category } from '../types';
import { normalizeText } from '../utils/text';
import { FieldError, inputClass, mutedText } from './ui';

interface TypeInputProps {
  id: string;
  category: Category;
  /** Texte écrit par l'utilisateur ('' = pas de type). */
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

const MAX_SUGGESTIONS = 8;

/**
 * Champ libre : l'utilisateur écrit le type de sa dépense (ex. « Taxi »).
 * Les types déjà écrits dans la catégorie sont proposés en raccourcis.
 */
export function TypeInput({ id, category, value, onChange, error }: TypeInputProps) {
  const query = normalizeText(value);
  const exactMatch = category.subcategories.some((s) => normalizeText(s.name) === query);
  const suggestions = category.subcategories
    .filter((s) => query === '' || exactMatch || normalizeText(s.name).includes(query))
    .slice(-MAX_SUGGESTIONS)
    .reverse();
  const isNew = query !== '' && !exactMatch;
  const errorId = `${id}-erreur`;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
        Type de dépense <span className="font-normal">(facultatif)</span>
      </label>
      <input
        id={id}
        type="text"
        maxLength={40}
        autoComplete="off"
        enterKeyHint="done"
        placeholder={`Précisez : ${category.name.toLowerCase()} de quel type ?`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : `${id}-aide`}
        className={`${inputClass} mt-1`}
      />
      <p id={`${id}-aide`} className={`mt-1 text-xs ${mutedText}`}>
        {isNew
          ? `« ${value.trim()} » sera ajouté à vos types de ${category.name}.`
          : 'Écrivez ce que vous voulez (ex. : taxi, loyer, woyofal…).'}
      </p>

      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={`Types déjà utilisés pour ${category.name}`}>
          {suggestions.map((s) => {
            const selected = normalizeText(s.name) === query;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(selected ? '' : s.name)}
                className={`min-h-11 rounded-full border-2 px-4 text-sm font-semibold transition-colors ${
                  selected ? 'text-slate-900 dark:text-white' : 'border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300'
                }`}
                style={selected ? { borderColor: category.color, backgroundColor: `${category.color}26` } : undefined}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
