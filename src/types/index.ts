/** Date au format ISO 'yyyy-MM-dd' (sans heure, pour éviter les décalages de fuseau). */
export type ISODate = string;

/** Mois au format 'yyyy-MM'. */
export type MonthKey = string;

export type PaymentMethod = 'especes' | 'wave' | 'orange_money' | 'carte' | 'virement';

export interface Expense {
  id: string;
  /** Montant en FCFA, entier strictement positif. */
  amount: number;
  categoryId: string;
  date: ISODate;
  paymentMethod: PaymentMethod;
  note: string;
  /** Horodatage ISO complet de création. */
  createdAt: string;
  /** Présent si la dépense a été générée par une dépense récurrente. */
  recurringId?: string;
}

export type ExpenseInput = Omit<Expense, 'id' | 'createdAt'>;

export interface Category {
  id: string;
  name: string;
  /** Couleur hexadécimale '#rrggbb'. */
  color: string;
  /** Emoji affiché comme icône. */
  icon: string;
  /** Ordre d'affichage. */
  order: number;
}

export interface Budget {
  categoryId: string;
  /** Plafond mensuel en FCFA, entier strictement positif. */
  monthlyLimit: number;
}

export interface RecurringExpense {
  id: string;
  amount: number;
  categoryId: string;
  paymentMethod: PaymentMethod;
  note: string;
  /** Jour du mois (1–31). Si le mois est plus court, le dernier jour est utilisé. */
  dayOfMonth: number;
  active: boolean;
  /** Dernier mois ('yyyy-MM') pour lequel la dépense a été créée (ou considérée comme traitée). */
  lastRunMonth: MonthKey;
}

export interface AppDataSnapshot {
  expenses: Expense[];
  categories: Category[];
  budgets: Budget[];
  recurring: RecurringExpense[];
}

export interface BackupFile extends AppDataSnapshot {
  app: 'mes-depenses';
  version: 1;
  exportedAt: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
