import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Budget, Category, Expense, RecurringExpense } from '../types';
import { DEFAULT_CATEGORIES } from '../utils/constants';

export interface ExpensesDB extends DBSchema {
  expenses: {
    key: string;
    value: Expense;
    indexes: { 'by-date': string; 'by-category': string };
  };
  categories: {
    key: string;
    value: Category;
  };
  budgets: {
    key: string;
    value: Budget;
  };
  recurring: {
    key: string;
    value: RecurringExpense;
  };
  /** Réglages globaux (ex. budget total du mois). */
  settings: {
    key: SettingKey;
    value: { key: SettingKey; value: number };
  };
}

export type SettingKey = 'totalBudget';

const DB_NAME = 'mes-depenses';
// v1 : création des stores · v2 : types (sous-catégories) dans chaque catégorie · v3 : réglages (budget total)
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<ExpensesDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<ExpensesDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ExpensesDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          const expenses = db.createObjectStore('expenses', { keyPath: 'id' });
          expenses.createIndex('by-date', 'date');
          expenses.createIndex('by-category', 'categoryId');
          db.createObjectStore('categories', { keyPath: 'id' });
          db.createObjectStore('budgets', { keyPath: 'categoryId' });
          db.createObjectStore('recurring', { keyPath: 'id' });

          const categories = tx.objectStore('categories');
          for (const category of DEFAULT_CATEGORIES) void categories.put(structuredClone(category));
        } else if (oldVersion < 2) {
          // Ajoute une liste de types vide aux catégories existantes (sans toucher aux dépenses).
          const categories = tx.objectStore('categories');
          void categories.getAll().then((all) => {
            for (const category of all) {
              if (!Array.isArray(category.subcategories)) void categories.put({ ...category, subcategories: [] });
            }
          });
        }
        if (oldVersion < 3) db.createObjectStore('settings', { keyPath: 'key' });
      },
      blocking() {
        // Une nouvelle version de l'app s'ouvre dans un autre onglet : on libère la base.
        void dbPromise?.then((db) => db.close());
        dbPromise = null;
      },
    }).catch((error: unknown) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

/** Supprime définitivement toute la base (utilisé en cas de code oublié). */
export async function deleteDatabase(): Promise<void> {
  if (dbPromise) {
    try {
      (await dbPromise).close();
    } catch {
      // base déjà inaccessible : on la supprime quand même
    }
    dbPromise = null;
  }
  await deleteDB(DB_NAME);
}
