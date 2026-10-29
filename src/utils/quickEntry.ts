import { addDays, format, getDay, parseISO, subDays, subMonths } from 'date-fns';
import type { Category, ISODate, PaymentMethod, SavingsGoal } from '../types';
import { daysInMonth, isValidISODate, monthKeyOf } from './dates';
import { MAX_AMOUNT } from './money';
import { normalizeText } from './text';

// Assistant de saisie hors-ligne : transforme « taxi 2000 wave hier » en dépense,
// « épargne 5000 tabaski » en versement et « salaire 250000 » en revenu. Fonctions pures.

export interface QuickEntry {
  amount: number;
  /** null = catégorie non reconnue (l'assistant la demande). */
  categoryId: string | null;
  /** Type reconnu (ex. « Taxi ») ou '' . */
  typeName: string;
  /** null = non précisé (on utilisera le dernier moyen employé). */
  paymentMethod: PaymentMethod | null;
  date: ISODate;
  note: string;
  /** Texte d'origine de cette dépense. */
  source: string;
}

export type QuickEntryResult = { ok: true; kind: 'expense'; entry: QuickEntry } | { ok: false; source: string; error: string };

/** Revenu, versement d'épargne ou retrait. */
export interface MoneyEntry {
  kind: 'income' | 'saving' | 'withdrawal';
  amount: number;
  date: ISODate;
  /** Objectif reconnu (épargne et retrait) ; null = à choisir. */
  goalId: string | null;
  /** Revenu : origine (« Salaire ») ; épargne non rattachée : nom proposé pour un nouvel objectif. */
  label: string;
  note: string;
  source: string;
}

export type SegmentResult = QuickEntryResult | { ok: true; kind: 'money'; entry: MoneyEntry };

export type AssistantIntent =
  | { kind: 'help' }
  | { kind: 'summary' }
  | { kind: 'entries'; results: SegmentResult[] }
  | { kind: 'empty' };

/** Mots-clés → catégorie par défaut + type proposé. Clés normalisées (minuscules, sans accents). */
const KEYWORDS: Record<string, readonly (readonly [string, string])[]> = {
  transport: [
    ['taxi', 'Taxi'], ['clando', 'Clando'], ['car rapide', 'Car rapide'], ['ndiaga ndiaye', 'Ndiaga Ndiaye'],
    ['ndiaga', 'Ndiaga Ndiaye'], ['bus', 'Bus'], ['dem dikk', 'Bus Dem Dikk'], ['ddd', 'Bus Dem Dikk'], ['tata', 'Tata'],
    ['ter', 'TER'], ['brt', 'BRT'], ['yango', 'Yango'], ['heetch', 'Heetch'], ['uber', 'Uber'], ['moto', 'Moto'],
    ['jakarta', 'Moto Jakarta'], ['essence', 'Carburant'], ['carburant', 'Carburant'], ['gasoil', 'Carburant'],
    ['peage', 'Péage'], ['parking', 'Parking'], ['avion', 'Avion'], ['billet', 'Billet'], ['train', 'Train'],
  ],
  alimentation: [
    ['marche', 'Marché'], ['boutique', 'Boutique'], ['supermarche', 'Supermarché'], ['auchan', 'Supermarché'],
    ['pain', 'Pain'], ['boulangerie', 'Pain'], ['riz', 'Riz'], ['huile', 'Huile'], ['sucre', 'Sucre'], ['lait', 'Lait'],
    ['cafe touba', 'Café Touba'], ['cafe', 'Café'], ['eau', 'Eau'], ['poisson', 'Poisson'], ['viande', 'Viande'],
    ['poulet', 'Poulet'], ['legumes', 'Légumes'], ['fruits', 'Fruits'], ['oignons', 'Oignons'], ['dibi', 'Dibi'],
    ['thieb', 'Thiéboudiène'], ['restaurant', 'Restaurant'], ['resto', 'Restaurant'], ['petit dejeuner', 'Petit-déjeuner'],
    ['dejeuner', 'Déjeuner'], ['diner', 'Dîner'], ['fataya', 'Fataya'], ['chawarma', 'Chawarma'], ['fast food', 'Fast-food'],
    ['pizza', 'Pizza'], ['courses', 'Courses'], ['nourriture', 'Nourriture'], ['repas', 'Repas'], ['bissap', 'Bissap'],
  ],
  logement: [
    ['loyer', 'Loyer'], ['location', 'Loyer'], ['menage', 'Ménage'], ['reparation', 'Réparations'],
    ['plombier', 'Réparations'], ['meubles', 'Meubles'],
  ],
  factures: [
    ['electricite', 'Électricité'], ['courant', 'Électricité'], ['senelec', 'Senelec'], ['woyofal', 'Woyofal'],
    ["sen'eau", "SEN'EAU"], ['seneau', "SEN'EAU"], ['facture', 'Facture'], ['wifi', 'Internet'], ['internet', 'Internet'],
    ['fibre', 'Internet'], ['canal', 'Canal+'], ['gaz', 'Gaz'], ['abonnement', 'Abonnement'],
  ],
  credit: [
    ['credit', 'Crédit'], ['recharge', 'Recharge'], ['pass', 'Pass internet'], ['data', 'Pass internet'],
    ['forfait', 'Forfait'], ['seddo', 'Seddo'], ['izi', 'Izi'],
  ],
  sante: [
    ['pharmacie', 'Pharmacie'], ['medicaments', 'Médicaments'], ['docteur', 'Consultation'], ['medecin', 'Consultation'],
    ['consultation', 'Consultation'], ['hopital', 'Hôpital'], ['clinique', 'Clinique'], ['analyses', 'Analyses'],
    ['dentiste', 'Dentiste'], ['lunettes', 'Lunettes'],
  ],
  education: [
    ['ecole', 'École'], ['scolarite', 'Scolarité'], ['inscription', 'Inscription'], ['fournitures', 'Fournitures'],
    ['cours', 'Cours'], ['livres', 'Livres'], ['universite', 'Université'], ['formation', 'Formation'],
  ],
  loisirs: [
    ['cinema', 'Cinéma'], ['sortie', 'Sortie'], ['match', 'Match'], ['foot', 'Football'], ['sport', 'Sport'],
    ['concert', 'Concert'], ['plage', 'Plage'], ['netflix', 'Netflix'], ['voyage', 'Voyage'], ['jeux', 'Jeux'],
  ],
  famille: [
    ['famille', 'Famille'], ['maman', 'Maman'], ['papa', 'Papa'], ['enfants', 'Enfants'], ['bapteme', 'Baptême'],
    ['mariage', 'Mariage'], ['ceremonie', 'Cérémonie'], ['tabaski', 'Tabaski'], ['korite', 'Korité'], ['magal', 'Magal'],
  ],
  autres: [
    ['vetements', 'Vêtements'], ['habits', 'Vêtements'], ['chaussures', 'Chaussures'], ['coiffeur', 'Coiffure'],
    ['coiffure', 'Coiffure'], ['cadeau', 'Cadeau'], ['tontine', 'Tontine'], ['transfert', 'Transfert'],
  ],
};

const SAVING_WORDS = new Set([
  'epargne', 'epargner', 'epargnes', 'economie', 'economies', 'economise', 'economiser', 'cagnotte', 'cote', 'verse',
  'verser', 'versement',
]);
const WITHDRAW_WORDS = new Set(['retrait', 'retire', 'retirer', 'retires', 'preleve']);
/** Mots de revenu → origine proposée ('' = on garde le reste du texte). */
const INCOME_WORDS = new Map([
  ['salaire', 'Salaire'], ['paie', 'Salaire'], ['revenu', 'Revenu'], ['revenus', 'Revenu'], ['prime', 'Prime'],
  ['bourse', 'Bourse'], ['commission', 'Commission'], ['benefice', 'Bénéfice'], ['vente', 'Vente'], ['ventes', 'Vente'],
  ['recu', ''], ['recus', ''], ['recue', ''], ['gagne', ''],
]);
const MONEY_STOPWORDS = new Set(['mis', 'mets', 'met', 'mettre', 'dans', 'vers', 'compte', 'objectif', 'argent', 'je', 'ai', 'fait']);

const PAYMENT_WORDS: readonly (readonly [string, PaymentMethod])[] = [
  ['orange money', 'orange_money'], ['wave', 'wave'], ['om', 'orange_money'], ['orange', 'orange_money'],
  ['especes', 'especes'], ['espece', 'especes'], ['cash', 'especes'], ['liquide', 'especes'],
  ['carte', 'carte'], ['cb', 'carte'], ['visa', 'carte'], ['virement', 'virement'],
];

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
const CURRENCY = new Set(['f', 'fcfa', 'cfa', 'franc', 'francs', 'frs', 'fr', 'xof']);
const STOPWORDS = new Set([
  'de', 'du', 'des', 'd', 'pour', 'en', 'a', 'au', 'aux', 'par', 'avec', 'le', 'la', 'les', 'l', 'un', 'une',
  "j'ai", 'jai', 'paye', 'payer', 'achete', 'acheter', 'depense', 'depenses', 'mon', 'ma', 'mes', 'via', 'sur', 'ce',
]);

/** Découpe « taxi 2000, pain 500 et crédit 1000 » en plusieurs dépenses (« 1,5k » n'est pas coupé). */
export function splitEntries(text: string): string[] {
  return text
    .split(/\n|;|\+|,(?!\d)|\bet\b|\bpuis\b/i)
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

interface Token {
  raw: string;
  norm: string;
  used: boolean;
}

function tokenize(segment: string): Token[] {
  return segment
    .replace(/[’`]/g, "'")
    .split(/\s+/)
    .map((raw) => raw.replace(/^[«"(]+|[»"),.!?:]+$/g, ''))
    .filter((raw) => raw !== '')
    .map((raw) => ({ raw, norm: normalizeText(raw), used: false }));
}

function toISO(date: Date): ISODate {
  return format(date, 'yyyy-MM-dd');
}

/** Repère la date : aujourd'hui, hier, avant-hier, un jour de la semaine, « le 12 », « 12/10 », « 12 octobre ». */
function extractDate(tokens: Token[], today: ISODate): ISODate {
  const now = parseISO(today);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    const next = tokens[i + 1];
    if (t.norm === "aujourd'hui" || t.norm === 'aujourdhui' || t.norm === 'auj') {
      t.used = true;
      return today;
    }
    if (t.norm === 'avant-hier' || (t.norm === 'avant' && next?.norm === 'hier')) {
      t.used = true;
      if (next && t.norm === 'avant') next.used = true;
      return toISO(subDays(now, 2));
    }
    if (t.norm === 'hier') {
      t.used = true;
      return toISO(subDays(now, 1));
    }
    const weekday = WEEKDAYS.indexOf(t.norm);
    if (weekday >= 0) {
      t.used = true;
      const back = (getDay(now) - weekday + 7) % 7;
      return toISO(subDays(now, back));
    }
    const slash = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/.exec(t.norm);
    if (slash) {
      const year = slash[3] ? (slash[3].length === 2 ? `20${slash[3]}` : slash[3]) : today.slice(0, 4);
      const iso = `${year}-${slash[2]!.padStart(2, '0')}-${slash[1]!.padStart(2, '0')}`;
      if (isValidISODate(iso)) {
        t.used = true;
        return iso;
      }
    }
    // « le 12 », « le 12 octobre », « 12 octobre »
    const dayToken = t.norm === 'le' && next && /^\d{1,2}$/.test(next.norm) ? next : /^\d{1,2}$/.test(t.norm) ? t : null;
    if (dayToken) {
      const after = tokens[tokens.indexOf(dayToken) + 1];
      const month = after ? MONTHS.indexOf(after.norm) : -1;
      if (t.norm === 'le' || month >= 0) {
        const day = Number(dayToken.norm);
        let monthKey = monthKeyOf(today);
        if (month >= 0) {
          monthKey = `${today.slice(0, 4)}-${String(month + 1).padStart(2, '0')}`;
          if (monthKey > monthKeyOf(today)) monthKey = `${Number(today.slice(0, 4)) - 1}${monthKey.slice(4)}`;
        } else if (day > Number(today.slice(8, 10))) {
          monthKey = format(subMonths(now, 1), 'yyyy-MM');
        }
        if (day >= 1 && day <= daysInMonth(monthKey)) {
          t.used = true;
          dayToken.used = true;
          if (month >= 0 && after) after.used = true;
          return `${monthKey}-${String(day).padStart(2, '0')}`;
        }
      }
    }
  }
  return today;
}

function parseNumber(text: string): number | null {
  if (/^\d{1,3}([.,]\d{3})+$/.test(text)) return Number(text.replace(/[.,]/g, ''));
  if (/^\d+([.,]\d+)?$/.test(text)) return Number(text.replace(',', '.'));
  return null;
}

/** Repère le montant : 2000, 2 000, 2.000, 2k, 1,5k, 2 mille, 2000f, 2000 fcfa… */
function extractAmount(tokens: Token[]): number | null {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.used) continue;
    const m = /^(\d+(?:[.,]\d+)*)(k|mille)?(f|fcfa|cfa|frs?|francs?|xof)?$/.exec(t.norm);
    if (!m) continue;
    let value = parseNumber(m[1]!);
    if (value === null) continue;
    const consumed = [t];
    let multiplied = Boolean(m[2]);
    // « 2 000 » ou « 150 000 » : groupes de 3 chiffres dans les jetons suivants
    let j = i + 1;
    while (!multiplied && Number.isInteger(value) && tokens[j] && !tokens[j]!.used && /^\d{3}$/.test(tokens[j]!.norm)) {
      value = value * 1000 + Number(tokens[j]!.norm);
      consumed.push(tokens[j]!);
      j++;
    }
    const next = tokens[j];
    if (!multiplied && next && (next.norm === 'k' || next.norm === 'mille')) {
      multiplied = true;
      consumed.push(next);
      j++;
    }
    if (multiplied) value *= 1000;
    const currency = tokens[j];
    if (currency && CURRENCY.has(currency.norm)) consumed.push(currency);
    const amount = Math.round(value);
    if (amount <= 0 || amount > MAX_AMOUNT) continue;
    for (const c of consumed) c.used = true;
    return amount;
  }
  return null;
}

function matchPhrase(tokens: Token[], phrase: string): Token[] | null {
  const words = phrase.split(' ');
  for (let i = 0; i + words.length <= tokens.length; i++) {
    const slice = tokens.slice(i, i + words.length);
    // « l'urgence » correspond à « urgence » (élision ignorée).
    const matches = (norm: string, word: string | undefined) => norm === word || norm === `${word}s` || `${norm}s` === word;
    if (slice.every((t, k) => !t.used && (matches(t.norm, words[k]) || matches(t.norm.replace(/^[cdjlmnst]'/, ''), words[k])))) {
      return slice;
    }
  }
  return null;
}

function extractPayment(tokens: Token[]): PaymentMethod | null {
  for (const [word, method] of PAYMENT_WORDS) {
    const match = matchPhrase(tokens, word);
    if (match) {
      for (const t of match) t.used = true;
      return method;
    }
  }
  return null;
}

interface CategoryMatch {
  categoryId: string;
  typeName: string;
  tokens: Token[];
  /** 3 = type créé par l'utilisateur, 2 = mot-clé, 1 = nom de catégorie. */
  priority: number;
}

function extractCategory(tokens: Token[], categories: readonly Category[]): { categoryId: string | null; typeName: string } {
  const existing = new Set(categories.map((c) => c.id));
  const candidates: CategoryMatch[] = [];
  const consider = (phrase: string, categoryId: string, typeName: string, priority: number) => {
    const normalized = normalizeText(phrase);
    if (normalized === '') return;
    const match = matchPhrase(tokens, normalized);
    if (match) candidates.push({ categoryId, typeName, tokens: match, priority });
  };

  for (const c of categories) {
    for (const s of c.subcategories) consider(s.name, c.id, s.name, 3);
    consider(c.name, c.id, '', 1);
    const firstWord = normalizeText(c.name).split(/[ /]/)[0];
    if (firstWord && firstWord.length >= 4) consider(firstWord, c.id, '', 1);
  }
  for (const [categoryId, words] of Object.entries(KEYWORDS)) {
    if (!existing.has(categoryId)) continue;
    for (const [word, typeName] of words) consider(word, categoryId, typeName, 2);
  }

  // Le plus long gagne, puis la priorité la plus haute.
  candidates.sort((a, b) => b.tokens.length - a.tokens.length || b.priority - a.priority);
  const best = candidates[0];
  if (!best) return { categoryId: null, typeName: '' };
  for (const t of best.tokens) t.used = true;
  // Ex. « transport taxi » : le nom de catégorie est aussi consommé.
  if (best.priority > 1) {
    const category = categories.find((c) => c.id === best.categoryId);
    const name = category ? matchPhrase(tokens, normalizeText(category.name)) : null;
    if (name) for (const t of name) t.used = true;
  }
  return { categoryId: best.categoryId, typeName: best.typeName };
}

export function parseQuickEntry(segment: string, categories: readonly Category[], today: ISODate): QuickEntryResult {
  const tokens = tokenize(segment);
  const date = extractDate(tokens, today);
  const amount = extractAmount(tokens);
  if (amount === null) {
    return { ok: false, source: segment, error: `Je n'ai pas trouvé de montant dans « ${segment} ». Exemple : « taxi 2000 ».` };
  }
  const paymentMethod = extractPayment(tokens);
  const { categoryId, typeName } = extractCategory(tokens, categories);
  const note = tokens
    .filter((t) => !t.used && !STOPWORDS.has(t.norm) && !CURRENCY.has(t.norm))
    .map((t) => t.raw)
    .join(' ')
    .trim();
  const capitalizedNote = note ? note.charAt(0).toLocaleUpperCase('fr-FR') + note.slice(1) : '';
  return {
    ok: true,
    kind: 'expense',
    entry: {
      amount,
      categoryId,
      typeName,
      paymentMethod,
      date: date > toISO(addDays(parseISO(today), 1)) ? today : date,
      note: normalizeText(capitalizedNote) === normalizeText(typeName) ? '' : capitalizedNote,
      source: segment,
    },
  };
}

function capitalize(text: string): string {
  return text ? text.charAt(0).toLocaleUpperCase('fr-FR') + text.slice(1) : '';
}

/** Objectif cité dans la phrase (nom complet, ou un de ses mots d'au moins 4 lettres). */
function extractGoal(tokens: Token[], goals: readonly SavingsGoal[]): string | null {
  let best: { id: string; tokens: Token[] } | null = null;
  for (const goal of goals) {
    const name = normalizeText(goal.name).replace(/[’']/g, "'");
    for (const phrase of [name, ...name.split(/[ ']/).filter((w) => w.length >= 4)]) {
      const match = matchPhrase(tokens, phrase);
      if (match && (!best || match.length > best.tokens.length)) best = { id: goal.id, tokens: match };
    }
  }
  if (!best) return null;
  for (const t of best.tokens) t.used = true;
  return best.id;
}

/** Type d'opération décrit par un morceau de phrase. */
export function classifySegment(segment: string, goals: readonly SavingsGoal[] = []): 'expense' | MoneyEntry['kind'] {
  const words = tokenize(segment).map((t) => t.norm);
  const has = (set: ReadonlySet<string> | ReadonlyMap<string, string>) => words.some((w) => set.has(w));
  const mentionsGoal = extractGoal(tokenize(segment), goals) !== null;
  if (has(WITHDRAW_WORDS) && (has(SAVING_WORDS) || mentionsGoal)) return 'withdrawal';
  if (has(SAVING_WORDS)) return 'saving';
  if (has(INCOME_WORDS)) return 'income';
  return 'expense';
}

export function parseMoneyEntry(
  segment: string,
  kind: MoneyEntry['kind'],
  goals: readonly SavingsGoal[],
  today: ISODate,
): SegmentResult {
  const tokens = tokenize(segment);
  const date = extractDate(tokens, today);
  const amount = extractAmount(tokens);
  if (amount === null) {
    const example = { income: 'salaire 250000', saving: 'épargne 5000 tabaski', withdrawal: 'retrait 5000 tabaski' }[kind];
    return { ok: false, source: segment, error: `Je n'ai pas trouvé de montant dans « ${segment} ». Exemple : « ${example} ».` };
  }
  extractPayment(tokens);
  let incomeLabel = '';
  let incomeFound = false;
  for (const t of tokens) {
    if (t.used) continue;
    if (SAVING_WORDS.has(t.norm) || WITHDRAW_WORDS.has(t.norm)) t.used = true;
    // Seul le premier mot de revenu sert d'origine : « salaire 30000 prime » garde « Prime » en note.
    const label = INCOME_WORDS.get(t.norm);
    if (kind === 'income' && label !== undefined && !incomeFound) {
      t.used = true;
      incomeFound = true;
      incomeLabel = label;
    }
  }
  let goalId = kind === 'income' ? null : extractGoal(tokens, goals);
  const rest = capitalize(
    tokens
      .filter((t) => !t.used && !STOPWORDS.has(t.norm) && !MONEY_STOPWORDS.has(t.norm) && !CURRENCY.has(t.norm))
      .map((t) => t.raw)
      .join(' ')
      .trim(),
  );
  let label = '';
  let note = rest;
  if (kind === 'income') {
    label = incomeLabel || rest || 'Revenu';
    note = incomeLabel ? rest : '';
  } else if (goalId === null) {
    // Un seul objectif et rien d'autre de précisé : c'est forcément lui.
    if (rest === '' && goals.length === 1) goalId = goals[0]!.id;
    label = rest;
    note = '';
  }
  return {
    ok: true,
    kind: 'money',
    entry: { kind, amount, date: date > today ? today : date, goalId, label, note, source: segment },
  };
}

/** Comprend ce que l'utilisateur demande à l'assistant. */
export function interpretMessage(
  text: string,
  categories: readonly Category[],
  today: ISODate,
  goals: readonly SavingsGoal[] = [],
): AssistantIntent {
  const normalized = normalizeText(text);
  if (normalized === '') return { kind: 'empty' };
  if (/^(aide|help|\?|comment (ca|ça) marche|exemples?)\s*\??$/.test(normalized)) return { kind: 'help' };
  const hasNumber = /\d/.test(normalized);
  if (!hasNumber && /(combien|total|bilan|resume|depense|reste|budget|epargn|economi|revenu|salaire)/.test(normalized)) {
    return { kind: 'summary' };
  }
  return {
    kind: 'entries',
    results: splitEntries(text).map((s) => {
      const kind = classifySegment(s, goals);
      return kind === 'expense' ? parseQuickEntry(s, categories, today) : parseMoneyEntry(s, kind, goals, today);
    }),
  };
}
