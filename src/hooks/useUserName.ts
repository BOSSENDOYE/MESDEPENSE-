import { useCallback, useSyncExternalStore } from 'react';
import { greetingFor } from '../utils/dates';
import {
  getUserName,
  getUserPhoto,
  setUserName as storeUserName,
  setUserPhoto as storeUserPhoto,
} from '../utils/storage';

// Profil (prénom, photo) partagé par tous les écrans, y compris l'écran de connexion.
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  for (const listener of listeners) listener();
}

/** Prénom de l'utilisateur (Réglages → Profil). */
export function useUserName(): [string, (name: string) => void] {
  const name = useSyncExternalStore(subscribe, getUserName);
  const setName = useCallback((next: string) => {
    storeUserName(next);
    notify();
  }, []);
  return [name, setName];
}

/** Photo de profil ; le setter retourne false si l'espace de stockage est plein. */
export function useUserPhoto(): [string | null, (dataUrl: string | null) => boolean] {
  const photo = useSyncExternalStore(subscribe, getUserPhoto);
  const setPhoto = useCallback((next: string | null) => {
    const saved = storeUserPhoto(next);
    if (saved) notify();
    return saved;
  }, []);
  return [photo, setPhoto];
}

/** « Bonsoir Omar 👋 » ou « Bonsoir 👋 » sans prénom. */
export function greetingLine(name: string, date: Date = new Date()): string {
  return `${greetingFor(date)}${name ? ` ${name}` : ''} 👋`;
}
