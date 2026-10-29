import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from './Icons';
import { IconButton } from './ui';

// Pile des modales ouvertes : seule la plus haute réagit à Échap.
const stack: string[] = [];

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Feuille modale (bas d'écran sur mobile, centrée sur grand écran). À monter seulement quand elle est ouverte. */
export function Modal({ title, onClose, children, footer }: ModalProps) {
  const id = useId();
  const titleId = `${id}-titre`;
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    stack.push(id);
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) panel.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stack[stack.length - 1] === id) {
        e.preventDefault();
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      const index = stack.lastIndexOf(id);
      if (index >= 0) stack.splice(index, 1);
      if (stack.length === 0) document.body.style.overflow = '';
      previous?.focus();
    };
  }, [id]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-950/60" aria-hidden="true" onClick={() => onCloseRef.current()} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white text-slate-900 shadow-2xl outline-none dark:bg-slate-900 dark:text-slate-100 sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 py-1 pl-4 pr-2 dark:border-slate-800">
          <h2 id={titleId} className="text-lg font-bold">
            {title}
          </h2>
          <IconButton label="Fermer" onClick={() => onCloseRef.current()}>
            <XIcon />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>
        {footer && (
          <div className="border-t border-slate-200 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 dark:border-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
