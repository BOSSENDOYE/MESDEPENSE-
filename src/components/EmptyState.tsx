import type { ReactNode } from 'react';
import { mutedText } from './ui';

interface EmptyStateProps {
  icon: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon, title, children, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-700">
      <span className="text-4xl" aria-hidden="true">
        {icon}
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      {children && <p className={`max-w-xs text-sm ${mutedText}`}>{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
