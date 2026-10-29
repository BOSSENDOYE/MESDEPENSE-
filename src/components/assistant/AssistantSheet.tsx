import { useEffect, useRef, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from 'react';
import { ensureType } from '../../db/categories';
import { addExpense, deleteExpense } from '../../db/expenses';
import { addIncome, addMovement, deleteIncome, deleteMovement, saveGoal } from '../../db/savings';
import { useAppData } from '../../hooks/useAppData';
import type { Category, Expense, SavingsGoal } from '../../types';
import { paymentMethodLabel } from '../../utils/constants';
import { currentMonthKey, dayOfMonthOf, formatDayHeading, todayISO } from '../../utils/dates';
import { createId } from '../../utils/id';
import { formatFCFA } from '../../utils/money';
import { interpretMessage, type MoneyEntry, type QuickEntry } from '../../utils/quickEntry';
import { balancesByGoal, incomesInMonth, savedInMonth, totalSaved, validateGoalName } from '../../utils/savings';
import { categoryBreakdown, expensesInMonth, sumAmounts } from '../../utils/stats';
import { getLastPaymentMethod, setLastPaymentMethod } from '../../utils/storage';
import { pluralize } from '../../utils/text';
import { CategoryIcon } from '../CategoryIcon';
import { Modal } from '../Modal';
import { inputClass, mutedText } from '../ui';

export type ChatMessage =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'text'; text: string; examples?: readonly string[] }
  | { id: string; kind: 'entry'; entry: QuickEntry; status: 'pending' | 'saved' | 'cancelled'; expense?: Expense }
  | { id: string; kind: 'money'; entry: MoneyEntry; status: 'pending' | 'saved' | 'cancelled'; recordId?: string };

type MoneyMessage = Extract<ChatMessage, { kind: 'money' }>;

const EXAMPLES = ['taxi 2000', 'marché 4500 wave hier', 'épargne 5000 tabaski', 'salaire 250000', 'combien ce mois ?'] as const;

const HELP = `Écrivez comme vous le diriez :
• dépenses : « taxi 2000 », « clando 1,5k om », « marché 4 500 wave hier », « loyer 150000 le 5 »
• plusieurs à la fois : « taxi 2000, pain 500 et crédit 1000 »
• épargne : « épargne 5000 tabaski », « j'ai mis 10 000 de côté », « retrait 2000 tabaski »
• revenus : « salaire 250000 », « j'ai reçu 20000 de papa »
• « combien ce mois ? » pour un bilan
Astuce : le micro 🎤 du clavier permet de dicter.`;

interface AssistantSheetProps {
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  onClose: () => void;
  onEditExpense: (expense: Expense) => void;
}

/** Assistant de saisie hors-ligne : comprend les phrases simples et enregistre les dépenses. */
export function AssistantSheet({ messages, setMessages, onClose, onEditExpense }: AssistantSheetProps) {
  const { categories, expenses, totalBudget, savingsBudget, goals, movements, incomes, getCategory, reload } = useAppData();
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const push = (...added: ChatMessage[]) => setMessages((list) => [...list, ...added]);
  const update = (id: string, patch: Partial<Extract<ChatMessage, { kind: 'entry' }>>) =>
    setMessages((list) => list.map((m) => (m.id === id && m.kind === 'entry' ? { ...m, ...patch } : m)));
  const updateMoney = (id: string, patch: Partial<MoneyMessage>) =>
    setMessages((list) => list.map((m) => (m.id === id && m.kind === 'money' ? { ...m, ...patch } : m)));

  /** Enregistre un revenu ou un mouvement d'épargne ; retourne l'identifiant créé. */
  async function saveMoney(entry: MoneyEntry, goalId: string | null): Promise<string> {
    if (entry.kind === 'income') {
      const income = await addIncome({ amount: entry.amount, date: entry.date, source: entry.label, note: entry.note });
      return income.id;
    }
    if (!goalId) throw new Error('Objectif manquant');
    const movement = await addMovement({
      goalId,
      amount: entry.kind === 'saving' ? entry.amount : -entry.amount,
      date: entry.date,
      note: entry.note,
    });
    return movement.id;
  }

  /** Message d'erreur si le retrait dépasse le solde de l'objectif, sinon null. */
  function withdrawalError(entry: MoneyEntry, goalId: string): string | null {
    if (entry.kind !== 'withdrawal') return null;
    const balance = balancesByGoal(movements).get(goalId) ?? 0;
    const goal = goals.find((g) => g.id === goalId);
    return entry.amount > balance
      ? `Impossible de retirer ${formatFCFA(entry.amount)} de « ${goal?.name ?? 'cet objectif'} » : le solde est de ${formatFCFA(balance)}.`
      : null;
  }

  async function save(entry: QuickEntry, categoryId: string): Promise<Expense> {
    const paymentMethod = entry.paymentMethod ?? getLastPaymentMethod();
    const subcategoryId = await ensureType(categoryId, entry.typeName);
    const expense = await addExpense({
      amount: entry.amount,
      categoryId,
      subcategoryId,
      date: entry.date,
      paymentMethod,
      note: entry.note,
    });
    if (entry.paymentMethod) setLastPaymentMethod(entry.paymentMethod);
    return expense;
  }

  function summary(): string {
    const today = todayISO();
    const monthKey = currentMonthKey();
    const month = expensesInMonth(expenses, monthKey);
    const monthTotal = sumAmounts(month);
    const todayTotal = sumAmounts(month.filter((e) => e.date === today));
    const top = categoryBreakdown(month)[0];
    const lines = [
      `Aujourd'hui : ${formatFCFA(todayTotal)}`,
      `Ce mois-ci : ${formatFCFA(monthTotal)} (${pluralize(month.length, 'dépense', 'dépenses')})`,
    ];
    if (top) lines.push(`Poste principal : ${getCategory(top.categoryId).icon} ${getCategory(top.categoryId).name} (${formatFCFA(top.total)})`);
    const income = sumAmounts(incomesInMonth(incomes, monthKey));
    const saved = savedInMonth(movements, monthKey);
    if (income > 0) lines.push(`Revenus : ${formatFCFA(income)} · reste à vivre : ${formatFCFA(income - monthTotal - saved)}`);
    if (goals.length > 0) lines.push(`Épargné ce mois : ${formatFCFA(saved)} (total : ${formatFCFA(totalSaved(movements))})`);
    if (totalBudget !== null) {
      const left = totalBudget - (savingsBudget ?? 0) - monthTotal;
      lines.push(left >= 0 ? `Reste dans le budget du mois : ${formatFCFA(left)}` : `⚠ Budget du mois dépassé de ${formatFCFA(-left)}`);
      const daysLeft = 1 + (new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0).getDate() - dayOfMonthOf(today));
      if (left > 0) lines.push(`Soit environ ${formatFCFA(Math.floor(left / daysLeft))} par jour jusqu'à la fin du mois.`);
    }
    return lines.join('\n');
  }

  async function handleSubmit(e?: FormEvent, override?: string) {
    e?.preventDefault();
    const message = (override ?? text).trim();
    if (!message) return;
    setText('');
    push({ id: createId(), kind: 'user', text: message });

    const intent = interpretMessage(message, categories, todayISO(), goals);
    if (intent.kind === 'help' || intent.kind === 'empty') {
      push({ id: createId(), kind: 'text', text: HELP, examples: EXAMPLES });
      return;
    }
    if (intent.kind === 'summary') {
      push({ id: createId(), kind: 'text', text: summary() });
      return;
    }

    const replies: ChatMessage[] = [];
    let saved = 0;
    for (const result of intent.results) {
      if (!result.ok) {
        replies.push({ id: createId(), kind: 'text', text: result.error, examples: ['aide'] });
        continue;
      }
      const id = createId();
      if (result.kind === 'money') {
        const { entry } = result;
        if (entry.kind !== 'income' && entry.goalId === null) {
          replies.push({ id, kind: 'money', entry, status: 'pending' });
          continue;
        }
        const problem = entry.goalId ? withdrawalError(entry, entry.goalId) : null;
        if (problem) {
          replies.push({ id, kind: 'text', text: problem });
          continue;
        }
        try {
          const recordId = await saveMoney(entry, entry.goalId);
          replies.push({ id, kind: 'money', entry, status: 'saved', recordId });
          saved++;
        } catch (err) {
          console.error(err);
          replies.push({ id: createId(), kind: 'text', text: `L'enregistrement de « ${entry.source} » a échoué. Réessayez.` });
        }
        continue;
      }
      if (result.entry.categoryId === null) {
        replies.push({ id, kind: 'entry', entry: result.entry, status: 'pending' });
        continue;
      }
      try {
        const expense = await save(result.entry, result.entry.categoryId);
        replies.push({ id, kind: 'entry', entry: result.entry, status: 'saved', expense });
        saved++;
      } catch (err) {
        console.error(err);
        replies.push({ id: createId(), kind: 'text', text: `L'enregistrement de « ${result.entry.source} » a échoué. Réessayez.` });
      }
    }
    if (saved > 0) await reload();
    push(...replies);
  }

  async function chooseCategory(messageId: string, entry: QuickEntry, category: Category) {
    try {
      const expense = await save(entry, category.id);
      await reload();
      update(messageId, { status: 'saved', expense, entry: { ...entry, categoryId: category.id } });
    } catch (err) {
      console.error(err);
      push({ id: createId(), kind: 'text', text: "L'enregistrement a échoué. Réessayez." });
    }
  }

  async function chooseGoal(message: MoneyMessage, goal: SavingsGoal | null) {
    try {
      let goalId = goal?.id ?? null;
      if (!goalId) {
        // Création d'un objectif à partir du nom proposé (« épargne 20000 moto » → « Moto »).
        const name = validateGoalName(message.entry.label, goals);
        if (!name.ok) {
          push({ id: createId(), kind: 'text', text: name.error });
          return;
        }
        const created: SavingsGoal = { id: createId(), name: name.value, icon: '🎯', target: null, deadline: null, createdAt: new Date().toISOString() };
        await saveGoal(created);
        goalId = created.id;
      }
      const problem = withdrawalError(message.entry, goalId);
      if (problem) {
        push({ id: createId(), kind: 'text', text: problem });
        return;
      }
      const recordId = await saveMoney(message.entry, goalId);
      await reload();
      updateMoney(message.id, { status: 'saved', recordId, entry: { ...message.entry, goalId } });
    } catch (err) {
      console.error(err);
      push({ id: createId(), kind: 'text', text: "L'enregistrement a échoué. Réessayez." });
    }
  }

  async function cancelMoney(message: MoneyMessage) {
    if (!message.recordId) return;
    try {
      if (message.entry.kind === 'income') await deleteIncome(message.recordId);
      else await deleteMovement(message.recordId);
      await reload();
      updateMoney(message.id, { status: 'cancelled' });
    } catch (err) {
      console.error(err);
      push({ id: createId(), kind: 'text', text: "L'annulation a échoué. Corrigez depuis l'onglet Épargne." });
    }
  }

  async function cancel(messageId: string, expense: Expense) {
    try {
      await deleteExpense(expense.id);
      await reload();
      update(messageId, { status: 'cancelled' });
    } catch (err) {
      console.error(err);
      push({ id: createId(), kind: 'text', text: "L'annulation a échoué. Supprimez la dépense depuis la liste." });
    }
  }

  return (
    <Modal
      title="💬 Assistant"
      onClose={onClose}
      footer={
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-2">
          {messages.length <= 1 && (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => void handleSubmit(undefined, example)}
                  className="min-h-9 shrink-0 rounded-full bg-emerald-50 px-3 text-sm font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
                >
                  {example}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <label htmlFor="message-assistant" className="sr-only">
              Message à l'assistant
            </label>
            <input
              ref={inputRef}
              id="message-assistant"
              type="text"
              autoComplete="off"
              enterKeyHint="send"
              placeholder="Ex. : taxi 2000 wave"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={`${inputClass} flex-1 rounded-full`}
            />
            <button
              type="submit"
              disabled={text.trim() === ''}
              aria-label="Envoyer"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white disabled:opacity-40 dark:bg-emerald-400 dark:text-slate-950"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m22 2-7 20-4-9-9-4z" />
                <path d="M22 2 11 13" />
              </svg>
            </button>
          </div>
        </form>
      }
    >
      <div className="flex min-h-[50dvh] flex-col gap-3" aria-live="polite">
        <BotBubble>
          Bonjour ! Dites-moi ce que vous avez dépensé, épargné ou reçu, je l'enregistre pour vous. Exemples : « taxi 2000
          wave », « épargne 5000 tabaski », « salaire 250000 ». Tapez « aide » pour plus d'exemples.
        </BotBubble>

        {messages.map((m) => {
          if (m.kind === 'user') {
            return (
              <p
                key={m.id}
                className="ml-auto max-w-[85%] whitespace-pre-line rounded-3xl rounded-br-md bg-emerald-700 px-4 py-2 text-white dark:bg-emerald-500 dark:text-slate-950"
              >
                {m.text}
              </p>
            );
          }
          if (m.kind === 'text') {
            return (
              <BotBubble key={m.id}>
                <span className="whitespace-pre-line">{m.text}</span>
                {m.examples && (
                  <span className="mt-2 flex flex-wrap gap-2">
                    {m.examples.map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => void handleSubmit(undefined, example)}
                        className="min-h-9 rounded-full bg-white px-3 text-sm font-medium text-emerald-900 ring-1 ring-emerald-200 dark:bg-slate-900 dark:text-emerald-100 dark:ring-emerald-900"
                      >
                        {example}
                      </button>
                    ))}
                  </span>
                )}
              </BotBubble>
            );
          }
          if (m.kind === 'money') {
            return (
              <MoneyCard
                key={m.id}
                message={m}
                goals={goals}
                onChoose={(goal) => void chooseGoal(m, goal)}
                onCancel={() => void cancelMoney(m)}
              />
            );
          }
          return (
            <EntryCard
              key={m.id}
              message={m}
              categories={categories}
              getCategory={getCategory}
              onChoose={(category) => void chooseCategory(m.id, m.entry, category)}
              onCancel={() => m.expense && void cancel(m.id, m.expense)}
              onEdit={() => m.expense && onEditExpense(m.expense)}
            />
          );
        })}
        <div ref={endRef} />
      </div>
    </Modal>
  );
}

function BotBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex max-w-[90%] items-end gap-2">
      <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
        <img src="/logo-app.png" alt="" width={24} height={24} className="h-full w-full object-contain" />
      </span>
      <div className="rounded-3xl rounded-bl-md bg-slate-100 px-4 py-2 text-slate-900 dark:bg-slate-800 dark:text-slate-100">
        {children}
      </div>
    </div>
  );
}

const MONEY_LOOK: Record<MoneyEntry['kind'], { icon: string; title: string; sign: string; saved: string }> = {
  income: { icon: '💵', title: 'Revenu', sign: '+', saved: '✓ Revenu noté' },
  saving: { icon: '🐷', title: 'Épargne', sign: '+', saved: '✓ Versement noté' },
  withdrawal: { icon: '↩️', title: 'Retrait', sign: '−', saved: '✓ Retrait noté' },
};

interface MoneyCardProps {
  message: MoneyMessage;
  goals: readonly SavingsGoal[];
  onChoose: (goal: SavingsGoal | null) => void;
  onCancel: () => void;
}

/** Carte d'un revenu ou d'un mouvement d'épargne dans la conversation. */
function MoneyCard({ message, goals, onChoose, onCancel }: MoneyCardProps) {
  const { entry, status } = message;
  const look = MONEY_LOOK[entry.kind];
  const goal = entry.goalId ? goals.find((g) => g.id === entry.goalId) : undefined;
  const title = entry.kind === 'income' ? entry.label : goal ? `${look.title} · ${goal.icon} ${goal.name}` : look.title;
  const details = [entry.kind === 'income' ? look.title : null, formatDayHeading(entry.date), entry.note || null]
    .filter((d): d is string => d !== null)
    .join(' · ');
  const proposed = entry.label && !goals.some((g) => g.name.toLocaleLowerCase('fr-FR') === entry.label.toLocaleLowerCase('fr-FR')) ? entry.label : '';

  return (
    <div className="flex max-w-[90%] items-end gap-2">
      <span aria-hidden="true" className="w-8 shrink-0" />
      <div
        className={`w-full rounded-3xl rounded-bl-md p-3 ring-1 ${
          status === 'cancelled'
            ? 'bg-slate-50 opacity-60 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'
            : 'bg-teal-50 ring-teal-200 dark:bg-teal-950 dark:ring-teal-900'
        }`}
      >
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-xl dark:bg-slate-900">
            {look.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className={`truncate font-semibold ${status === 'cancelled' ? 'line-through' : ''}`}>{title}</p>
            <p className={`truncate text-xs ${mutedText}`}>{details}</p>
          </div>
          <p className={`shrink-0 font-bold tabular-nums ${status === 'cancelled' ? 'line-through' : ''}`}>
            {look.sign}
            {formatFCFA(entry.amount)}
          </p>
        </div>

        {status === 'saved' && (
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-teal-100 pt-2 dark:border-teal-900">
            <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">{look.saved}</span>
            <span className="flex gap-1">
              <a href="#/epargne" className="flex min-h-9 items-center rounded-full px-3 text-sm font-semibold text-slate-700 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800">
                Voir
              </a>
              <button type="button" onClick={onCancel} className="min-h-9 rounded-full px-3 text-sm font-semibold text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950">
                Annuler
              </button>
            </span>
          </div>
        )}
        {status === 'cancelled' && <p className={`mt-2 text-sm ${mutedText}`}>Annulé.</p>}

        {status === 'pending' && (
          <div className="mt-2 border-t border-teal-100 pt-2 dark:border-teal-900">
            <p className="text-sm font-medium">{entry.kind === 'withdrawal' ? 'Retirer de quel objectif ?' : 'Pour quel objectif ?'}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {goals.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onChoose(g)}
                  className="min-h-11 rounded-full bg-white px-3 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700"
                >
                  {g.icon} {g.name}
                </button>
              ))}
              {entry.kind === 'saving' && (
                <button
                  type="button"
                  onClick={() => onChoose(null)}
                  disabled={!proposed}
                  className="min-h-11 rounded-full border-2 border-dashed border-teal-700 px-3 text-sm font-semibold text-teal-800 disabled:hidden dark:border-teal-400 dark:text-teal-300"
                >
                  + Créer « {proposed} »
                </button>
              )}
            </div>
            {entry.kind === 'saving' && !proposed && goals.length === 0 && (
              <p className={`mt-2 text-sm ${mutedText}`}>
                Précisez un nom, ex. « épargne {entry.amount} tabaski », ou créez un objectif dans l'onglet Épargne.
              </p>
            )}
            {entry.kind === 'withdrawal' && goals.length === 0 && (
              <p className={`mt-2 text-sm ${mutedText}`}>Aucun objectif d'épargne pour l'instant.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface EntryCardProps {
  message: Extract<ChatMessage, { kind: 'entry' }>;
  categories: readonly Category[];
  getCategory: (id: string) => Category;
  onChoose: (category: Category) => void;
  onCancel: () => void;
  onEdit: () => void;
}

function EntryCard({ message, categories, getCategory, onChoose, onCancel, onEdit }: EntryCardProps) {
  const { entry, status } = message;
  const category = entry.categoryId ? getCategory(entry.categoryId) : null;
  const title = entry.typeName || category?.name || entry.note || 'Dépense';
  const details = [
    category && entry.typeName ? category.name : null,
    paymentMethodLabel(entry.paymentMethod ?? getLastPaymentMethod()),
    formatDayHeading(entry.date),
  ]
    .filter((d): d is string => d !== null)
    .join(' · ');

  return (
    <div className="flex max-w-[90%] items-end gap-2">
      <span aria-hidden="true" className="w-8 shrink-0" />
      <div
        className={`w-full rounded-3xl rounded-bl-md p-3 ring-1 ${
          status === 'cancelled'
            ? 'bg-slate-50 opacity-60 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'
            : 'bg-white ring-slate-200 dark:bg-slate-900 dark:ring-slate-700'
        }`}
      >
        <div className="flex items-center gap-3">
          {category ? <CategoryIcon category={category} size="sm" /> : <span className="text-2xl" aria-hidden="true">❔</span>}
          <div className="min-w-0 flex-1">
            <p className={`truncate font-semibold ${status === 'cancelled' ? 'line-through' : ''}`}>{title}</p>
            <p className={`truncate text-xs ${mutedText}`}>{details}</p>
            {entry.note && entry.note !== title && <p className={`truncate text-xs ${mutedText}`}>« {entry.note} »</p>}
          </div>
          <p className={`shrink-0 font-bold tabular-nums ${status === 'cancelled' ? 'line-through' : ''}`}>{formatFCFA(entry.amount)}</p>
        </div>

        {status === 'saved' && (
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
            <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">✓ Enregistrée</span>
            <span className="flex gap-1">
              <button type="button" onClick={onEdit} className="min-h-9 rounded-full px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                Modifier
              </button>
              <button type="button" onClick={onCancel} className="min-h-9 rounded-full px-3 text-sm font-semibold text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950">
                Annuler
              </button>
            </span>
          </div>
        )}
        {status === 'cancelled' && <p className={`mt-2 text-sm ${mutedText}`}>Annulée.</p>}

        {status === 'pending' && (
          <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
            <p className="text-sm font-medium">Dans quelle catégorie ?</p>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onChoose(c)}
                  className="flex min-h-[3.75rem] flex-col items-center justify-center gap-0.5 rounded-2xl bg-slate-100 p-1 text-[0.7rem] font-medium leading-tight text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                >
                  <span className="text-xl" aria-hidden="true">
                    {c.icon}
                  </span>
                  <span className="line-clamp-2 text-center">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
