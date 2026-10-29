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

/** Versement automatique mensuel vers un objectif d'épargne. */
export interface SavingsAuto {
  amount: number;
  /** Jour du mois (1–31). Si le mois est plus court, le dernier jour est utilisé. */
  dayOfMonth: number;
  active: boolean;
  /** Dernier mois ('yyyy-MM') pour lequel le versement a été noté. */
  lastRunMonth: MonthKey;
}

/** Objectif d'épargne (cagnotte). L'application note l'argent mis de côté, elle ne le déplace pas. */
export interface SavingsGoal {
  id: string;
  name: string;
  /** Emoji affiché comme icône. */
  icon: string;
  /** Montant visé en FCFA ; null = épargne libre, sans montant cible. */
  target: number | null;
  /** Mois visé ('yyyy-MM') ; null = pas d'échéance. */
  deadline: MonthKey | null;
  createdAt: string;
  auto?: SavingsAuto;
}

/** Mouvement d'épargne : versement (montant positif) ou retrait (montant négatif). */
export interface SavingsMovement {
  id: string;
  goalId: string;
  /** FCFA, entier non nul : > 0 versement, < 0 retrait. */
  amount: number;
  date: ISODate;
  note: string;
  createdAt: string;
  /** Présent si le versement a été créé par le versement automatique. */
  auto?: boolean;
}

export type SavingsMovementInput = Omit<SavingsMovement, 'id' | 'createdAt'>;

/** Argent reçu : salaire, vente, transfert… */
export interface Income {
  id: string;
  /** Montant en FCFA, entier strictement positif. */
  amount: number;
  date: ISODate;
  /** Origine écrite librement (ex. « Salaire »). */
  source: string;
  note: string;
  createdAt: string;
}

export type IncomeInput = Omit<Income, 'id' | 'createdAt'>;

export interface AppDataSnapshot {
  expenses: Expense[];
  categories: Category[];
  budgets: Budget[];
  recurring: RecurringExpense[];
  /** Budget total du mois (FCFA), à répartir entre les catégories ; null = non défini. */
  totalBudget: number | null;
  /** Part du budget du mois réservée à l'épargne ; null = aucune. */
  savingsBudget: number | null;
  goals: SavingsGoal[];
  movements: SavingsMovement[];
  incomes: Income[];
}

export interface BackupFile extends AppDataSnapshot {
  app: 'mes-depenses';
  version: 1;
  exportedAt: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
