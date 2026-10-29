import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { applyDueRecurring } from '../db/recurring';
import { readAllData } from '../db/snapshot';
import type { AppDataSnapshot, Category } from '../types';
import { sortCategories } from '../utils/categories';
import { UNKNOWN_CATEGORY } from '../utils/constants';
import { pluralize } from '../utils/text';
import { useToast } from './useToast';

type Status = 'loading' | 'ready' | 'error';

export interface AppDataContextValue extends AppDataSnapshot {
  status: Status;
  error: string | null;
  /** Retourne la catégorie, ou une catégorie « supprimée » de remplacement. */
  getCategory: (id: string) => Category;
  /** Relit toutes les données depuis IndexedDB. */
  reload: () => Promise<void>;
  /** Crée les dépenses récurrentes échues puis recharge si besoin. Retourne le nombre créé. */
  runRecurring: () => Promise<number>;
}

const EMPTY: AppDataSnapshot = { expenses: [], categories: [], budgets: [], recurring: [], totalBudget: null };

const AppDataContext = createContext<AppDataContextValue | null>(null);

function describeError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return "L'espace de stockage du téléphone est plein.";
  }
  return "Impossible d'accéder aux données enregistrées sur cet appareil. Si vous êtes en navigation privée, ouvrez l'application dans un onglet normal.";
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AppDataSnapshot>(EMPTY);

  const reload = useCallback(async () => {
    try {
      const snapshot = await readAllData();
      setData({ ...snapshot, categories: sortCategories(snapshot.categories) });
      setStatus('ready');
      setError(null);
    } catch (err) {
      console.error(err);
      setError(describeError(err));
      setStatus('error');
    }
  }, []);

  const runRecurring = useCallback(async () => {
    try {
      const created = await applyDueRecurring();
      if (created > 0) {
        await reload();
        showToast(`${pluralize(created, 'dépense récurrente ajoutée', 'dépenses récurrentes ajoutées')}.`, 'info');
      }
      return created;
    } catch (err) {
      console.error(err);
      return 0;
    }
  }, [reload, showToast]);

  useEffect(() => {
    void (async () => {
      await runRecurring();
      await reload();
    })();
    // L'app peut rester ouverte plusieurs jours : on revérifie au retour au premier plan.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void runRecurring();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reload, runRecurring]);

  const categoriesById = useMemo(() => new Map(data.categories.map((c) => [c.id, c])), [data.categories]);
  const getCategory = useCallback((id: string) => categoriesById.get(id) ?? UNKNOWN_CATEGORY, [categoriesById]);

  const value = useMemo<AppDataContextValue>(
    () => ({ ...data, status, error, getCategory, reload, runRecurring }),
    [data, status, error, getCategory, reload, runRecurring],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData doit être utilisé dans <AppDataProvider>.');
  return ctx;
}
