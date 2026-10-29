import type { ReactNode } from 'react';

interface LockLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Écran plein, aux couleurs de l'application, pour la connexion et la création du code. */
export function LockLayout({ title, subtitle, children, footer }: LockLayoutProps) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-950 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-white/5" />

      <div className="relative flex w-full max-w-sm flex-1 flex-col items-center">
        <img src="/icon.svg" alt="" width={72} height={72} className="mt-4 h-[72px] w-[72px] rounded-3xl shadow-lg shadow-emerald-950/40" />
        <h1 className="mt-4 text-center text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-center text-sm text-emerald-50">{subtitle}</p>}
        <div className="mt-8 w-full">{children}</div>
        {footer && <div className="mt-auto pt-6 text-center">{footer}</div>}
      </div>
    </main>
  );
}
