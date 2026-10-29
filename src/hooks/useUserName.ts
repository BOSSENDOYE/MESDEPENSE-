import { useCallback, useSyncExternalStore } from 'react';
import { greetingFor } from '../utils/dates';
import { getUserName, setUserName as storeUserName } from '../utils/storage';

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Prénom de l'utilisateur (Réglages → Profil), partagé par tous les écrans. */
export function useUserName(): [string, (name: string) => void] {
  const name = useSyncExternalStore(subscribe, getUserName);
  const setName = useCallback((next: string) => {
    storeUserName(next);
    for (const listener of listeners) listener();
  }, []);
  return [name, setName];
}

/** « Bonsoir Omar 👋 » ou « Bonsoir 👋 » sans prénom. */
export function greetingLine(name: string, date: Date = new Date()): string {
  return `${greetingFor(date)}${name ? ` ${name}` : ''} 👋`;
}
