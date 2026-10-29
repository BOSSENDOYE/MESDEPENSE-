import type { MonthKey } from '../types';
import { currentMonthKey, formatMonthLabel, shiftMonth } from '../utils/dates';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';
import { IconButton } from './ui';

interface MonthSwitcherProps {
  month: MonthKey;
  onChange: (month: MonthKey) => void;
}

export function MonthSwitcher({ month, onChange }: MonthSwitcherProps) {
  const isCurrent = month >= currentMonthKey();
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <IconButton label="Mois précédent" onClick={() => onChange(shiftMonth(month, -1))}>
        <ChevronLeftIcon />
      </IconButton>
      <p className="text-base font-semibold" aria-live="polite">
        {formatMonthLabel(month)}
      </p>
      <IconButton label="Mois suivant" onClick={() => onChange(shiftMonth(month, 1))} disabled={isCurrent}>
        <ChevronRightIcon />
      </IconButton>
    </div>
  );
}
