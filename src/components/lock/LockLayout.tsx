import type { ReactNode } from 'react';

interface LockLayoutProps {
  /** Petit texte au-dessus du titre (ex. « Bonsoir »). */
  eyebrow?: string;
  title: string;
  /** Petite ligne sous le titre (ex. la date). */
  caption?: string;
  /** Initiale affichée dans l'avatar ; sans valeur, le logo de l'application est affiché. */
  avatar?: string;
  /** Pavé de saisie : occupe l'espace restant, clavier en bas. */
  children: ReactNode;
  footer?: ReactNode;
}

/** Écran de connexion / création du code : en-tête vert arrondi, pavé sur fond clair. */
export function LockLayout({ eyebrow, title, caption, avatar, children, footer }: LockLayoutProps) {
  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="relative overflow-hidden rounded-b-[2.5rem] bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900 px-6 pb-[clamp(1.25rem,3.5dvh,2rem)] pt-[max(1rem,env(safe-area-inset-top))] text-white shadow-lg shadow-emerald-900/20">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-teal-300/10" />

        <div className="relative mx-auto flex max-w-sm items-center gap-2 text-sm font-semibold text-emerald-50">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white p-0.5 shadow-sm">
            <img src="/logo-app.png" alt="" width={24} height={24} className="h-full w-full object-contain" />
          </span>
          Mes Dépenses
        </div>

        <div className="relative mx-auto mt-[clamp(0.75rem,2.5dvh,1.5rem)] flex max-w-sm flex-col items-center text-center">
          {avatar ? (
            <div
              aria-hidden="true"
              className="flex h-[clamp(3.5rem,9dvh,5rem)] w-[clamp(3.5rem,9dvh,5rem)] items-center justify-center rounded-full bg-white/15 text-[clamp(1.5rem,4dvh,2.25rem)] font-bold ring-4 ring-white/25 backdrop-blur"
            >
              {avatar}
            </div>
          ) : (
            <div className="flex h-[clamp(3.5rem,9dvh,5rem)] w-[clamp(3.5rem,9dvh,5rem)] items-center justify-center rounded-[1.4rem] bg-white p-2 shadow-lg shadow-emerald-950/30 ring-4 ring-white/25">
              <img src="/logo-app.png" alt="" width={64} height={64} className="h-full w-full object-contain" />
            </div>
          )}
          {eyebrow && <p className="mt-3 text-sm font-medium text-emerald-100">{eyebrow}</p>}
          <h1 className="text-[clamp(1.5rem,3.6dvh,1.875rem)] font-bold leading-tight tracking-tight">{title}</h1>
          {caption && <p className="mt-1 text-xs font-medium text-emerald-100/90">{caption}</p>}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center px-6 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {children}
        {footer && <div className="mt-1 flex min-h-11 items-center justify-center">{footer}</div>}
      </div>
    </main>
  );
}
