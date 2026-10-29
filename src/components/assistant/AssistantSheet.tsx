import { useEffect, useRef, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from 'react';
import { ensureType } from '../../db/categories';
import { addExpense, deleteExpense } from '../../db/expenses';
import { useAppData } from '../../hooks/useAppData';
import type { Category, Expense } from '../../types';
import { paymentMethodLabel } from '../../utils/constants';
import { currentMonthKey, dayOfMonthOf, formatDayHeading, todayISO } from '../../utils/dates';
import { createId } from '../../utils/id';
import { formatFCFA } from '../../utils/money';
import { interpretMessage, type QuickEntry } from '../../utils/quickEntry';
import { categoryBreakdown, expensesInMonth, sumAmounts } from '../../utils/stats';
import { getLastPaymentMethod, setLastPaymentMethod } from '../../utils/storage';
import { pluralize } from '../../utils/text';
import { CategoryIcon } from '../CategoryIcon';
import { Modal } from '../Modal';
import { inputClass, mutedText } from '../ui';

export type ChatMessage =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'text'; text: string; examples?: readonly string[] }
  | { id: string; kind: 'entry'; entry: QuickEntry; status: 'pending' | 'saved' | 'cancelled'; expense?: Expense };

const EXAMPLES = ['taxi 2000', 'marché 4500 wave hier', 'pain 500 et crédit 1000', 'combien ce mois ?'] as const;

const HELP = `Écrivez vos dépenses comme vous les diriez :
• « taxi 2000 » ou « clando 1,5k om »
• « marché 4 500 wave hier », « loyer 150000 le 5 »
• plusieurs à la fois : « taxi 2000, pain 500 et crédit 1000 »
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
  const { categories, expenses, totalBudget, getCategory, reload } = useAppData();
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
    const month = expensesInMonth(expenses, currentMonthKey());
    const monthTotal = sumAmounts(month);
    const todayTotal = sumAmounts(month.filter((e) => e.date === today));
    const top = categoryBreakdown(month)[0];
    const lines = [
      `Aujourd'hui : ${formatFCFA(todayTotal)}`,
      `Ce mois-ci : ${formatFCFA(monthTotal)} (${pluralize(month.length, 'dépense', 'dépenses')})`,
    ];
    if (top) lines.push(`Poste principal : ${getCategory(top.categoryId).icon} ${getCategory(top.categoryId).name} (${formatFCFA(top.total)})`);
    if (totalBudget !== null) {
      const left = totalBudget - monthTotal;
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

    const intent = interpretMessage(message, categories, todayISO());
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
          Bonjour ! Dites-moi ce que vous avez dépensé, je l'enregistre pour vous. Exemple : « taxi 2000 wave ». Tapez
          « aide » pour plus d'exemples.
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
