import { registerSW } from 'virtual:pwa-register';

// État de la PWA, observable depuis React (voir hooks/usePwaStatus.ts).

export type OfflineState = 'unsupported' | 'preparing' | 'ready' | 'error';

function initialOfflineState(): OfflineState {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return 'unsupported';
  // Page déjà servie par le service worker : le cache est complet depuis une visite précédente.
  return navigator.serviceWorker.controller ? 'ready' : 'preparing';
}

let offlineState: OfflineState = initialOfflineState();
let online = navigator.onLine;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function setOfflineState(next: OfflineState): void {
  if (offlineState === next) return;
  offlineState = next;
  emit();
}

export function subscribePwa(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOfflineState(): OfflineState {
  return offlineState;
}

export function getOnline(): boolean {
  return online;
}

/** Enregistre le service worker et suit l'état réseau. À appeler une fois au démarrage. */
export function setupPwa(): void {
  const updateOnline = () => {
    online = navigator.onLine;
    emit();
  };
  window.addEventListener('online', updateOnline);
  window.addEventListener('offline', updateOnline);

  if (offlineState === 'unsupported') return;

  registerSW({
    immediate: true,
    onOfflineReady: () => setOfflineState('ready'),
    onRegisterError: (error: unknown) => {
      console.error('Service worker non enregistré', error);
      setOfflineState('error');
    },
  });
  // `ready` se résout quand un service worker actif (donc avec le cache complet) contrôle le site,
  // y compris lors des ouvertures suivantes où onOfflineReady ne se redéclenche pas.
  void navigator.serviceWorker.ready.then(() => setOfflineState('ready'));
}
