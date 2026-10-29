import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToastContext, type ToastTone } from '../hooks/useToast';

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

const TONES: Record<ToastTone, string> = {
  success: 'bg-emerald-800 text-white dark:bg-emerald-300 dark:text-slate-950',
  error: 'bg-red-800 text-white dark:bg-red-300 dark:text-slate-950',
  info: 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-950',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const counter = useRef(0);

  const showToast = useCallback((message: string, tone: ToastTone = 'success') => {
    counter.current += 1;
    setToast({ id: counter.current, message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.tone === 'error' ? 6000 : 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-36 z-[60] flex justify-center px-4"
      >
        {toast && (
          <button
            key={toast.id}
            type="button"
            onClick={() => setToast(null)}
            className={`pointer-events-auto min-h-11 max-w-md rounded-2xl px-4 py-3 text-left text-sm font-medium shadow-lg ${TONES[toast.tone]}`}
          >
            {toast.message}
          </button>
        )}
      </div>
    </ToastContext.Provider>
  );
}
