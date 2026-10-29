import type { ReactNode } from 'react';

interface LockLayoutProps {
  /** Petit texte au-dessus du titre (ex. « Bonsoir 👋 »). */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Pavé de saisie : occupe l'espace restant, clavier en bas. */
  children: ReactNode;
  footer?: ReactNode;
}

/** Écran plein, aux couleurs de l'application, pour la connexion et la création du code. */
export function LockLayout({ eyebrow, title, subtitle, children, footer }: LockLayoutProps) {
  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-emerald-900 text-white">
      {/* Fond : dégradé + halo lumineux discret derrière le logo. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-emerald-700 via-emerald-800 to-teal-950" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300/20 blur-3xl"
      />

      <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col items-center px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <header className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg shadow-emerald-950/30">
            <img src="/icon.svg" alt="" width={44} height={44} className="h-11 w-11" />
          </div>
          {eyebrow && <p className="mt-3 text-sm font-medium text-emerald-100">{eyebrow}</p>}
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight">{title}</h1>
          {/* Masqué sur les écrans très courts pour garder le pavé entier visible. */}
          {subtitle && (
            <p className="mt-1 max-w-[18rem] text-sm text-emerald-50/90 [@media(max-height:600px)]:hidden">{subtitle}</p>
          )}
        </header>

        {children}

        {footer && <div className="mt-2 flex min-h-11 items-center justify-center">{footer}</div>}
      </div>
    </main>
  );
}
