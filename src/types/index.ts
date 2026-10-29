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
  /** Type précis dans la catégorie (ex. Transport → Taxi). Facultatif. */
  subcategoryId?: string;
  /** Présent si la dépense a été générée par une dépense récurrente. */
  recurringId?: string;
}

export type ExpenseInput = Omit<Expense, 'id' | 'createdAt'>;

/** Type de dépense à l'intérieur d'une catégorie (ex. Taxi, Clando pour Transport). */
export interface Subcategory {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  /** Couleur hexadécimale '#rrggbb'. */
  color: string;
  /** Emoji affiché comme icône. */
  icon: string;
  /** Ordre d'affichage. */
  order: number;
  /** Types proposés pour cette catégorie, ajoutés librement par l'utilisateur. */
  subcategories: Subcategory[];
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
  subcategoryId?: string;
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
  /** Budget total du mois (FCFA), à répartir entre les catégories ; null = non défini. */
  totalBudget: number | null;
}

export interface BackupFile extends AppDataSnapshot {
  app: 'mes-depenses';
  version: 1;
  exportedAt: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
