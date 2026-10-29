import type { Category, Expense } from '../types';
import { paymentMethodLabel } from '../utils/constants';
import { formatFCFA } from '../utils/money';
import { CategoryIcon } from './CategoryIcon';
import { RepeatIcon, TrashIcon } from './Icons';
import { IconButton, mutedText } from './ui';

interface ExpenseRowProps {
  expense: Expense;
  category: Category;
  onEdit: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
}

export function ExpenseRow({ expense, category, onEdit, onDelete }: ExpenseRowProps) {
  return (
    <li className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onEdit(expense)}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label={`Modifier : ${category.name}, ${formatFCFA(expense.amount)}${expense.note ? `, ${expense.note}` : ''}`}
      >
        <CategoryIcon category={category} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{expense.note || category.name}</span>
          <span className={`flex items-center gap-1 truncate text-sm ${mutedText}`}>
            {expense.note ? `${category.name} · ` : ''}
            {paymentMethodLabel(expense.paymentMethod)}
            {expense.recurringId && <RepeatIcon width={14} height={14} aria-label="récurrente" />}
          </span>
        </span>
        <span className="shrink-0 font-semibold tabular-nums">{formatFCFA(expense.amount)}</span>
      </button>
      {onDelete && (
        <IconButton label={`Supprimer la dépense de ${formatFCFA(expense.amount)}`} onClick={() => onDelete(expense)}>
          <TrashIcon width={20} height={20} />
        </IconButton>
      )}
    </li>
  );
}
