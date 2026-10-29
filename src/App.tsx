import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { FirstRunSetup } from './components/lock/FirstRunSetup';
import { LockScreen } from './components/lock/LockScreen';
import { LockProvider, useLock } from './hooks/useLock';
import { AssistantSheet, type ChatMessage } from './components/assistant/AssistantSheet';
import { BottomNav } from './components/BottomNav';
import { ExpenseFormModal } from './components/ExpenseFormModal';
import { PlusIcon } from './components/Icons';
import { ToastProvider } from './components/ToastProvider';
import { Button } from './components/ui';
import { AppDataProvider, useAppData } from './hooks/useAppData';
import { useHashRoute } from './hooks/useHashRoute';
import { usePwaStatus } from './hooks/usePwaStatus';
import { useToast } from './hooks/useToast';
import { BudgetsPage } from './pages/BudgetsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { HomePage } from './pages/HomePage';
import { SavingsPage } from './pages/SavingsPage';
import { SettingsPage } from './pages/SettingsPage';
import type { Expense } from './types';
import { formatFCFA, validateAmount } from './utils/money';
import { clearDraft, isDraftMeaningful, loadDraft, NEW_EXPENSE_DRAFT, type ExpenseDraft } from './utils/storage';

export default function App() {
  return (
    <ToastProvider>
      <LockProvider>
        <LockGate>
          <AppDataProvider>
            <AppShell />
          </AppDataProvider>
        </LockGate>
      </LockProvider>
    </ToastProvider>
  );
}

/** Les données ne sont chargées et affichées qu'une fois l'application déverrouillée. */
function LockGate({ children }: { children: ReactNode }) {
  const { mode } = useLock();
  if (mode === 'setup') return <FirstRunSetup />;
  if (mode === 'locked') return <LockScreen />;
  return <>{children}</>;
}

type EditorState = { open: false } | { open: true; expense: Expense | null };

function readPendingDraft(): ExpenseDraft | null {
  const draft = loadDraft(NEW_EXPENSE_DRAFT);
  return draft && isDraftMeaningful(draft) ? draft : null;
}

function AppShell() {
  const { status, error } = useAppData();
  const [route] = useHashRoute();
  const [editor, setEditor] = useState<EditorState>({ open: false });
  const [pendingDraft, setPendingDraft] = useState(readPendingDraft);
  // La conversation reste affichée tant que l'application est ouverte.
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<ChatMessage[]>([]);
  const { offlineState, online } = usePwaStatus();
  const { showToast } = useToast();
  const previousOfflineState = useRef(offlineState);

  // Prévenir au moment où le cache hors-ligne vient d'être complété (première ouverture).
  useEffect(() => {
    if (previousOfflineState.current === 'preparing' && offlineState === 'ready') {
      showToast("✅ Application prête : elle fonctionne maintenant sans Internet.");
    }
    previousOfflineState.current = offlineState;
  }, [offlineState, showToast]);

  const openNew = useCallback(() => setEditor({ open: true, expense: null }), []);
  const openEdit = useCallback((expense: Expense) => setEditor({ open: true, expense }), []);
  const closeEditor = useCallback(() => {
    setEditor({ open: false });
    setPendingDraft(readPendingDraft());
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center" role="status">
        <p className="text-lg font-medium">Chargement…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="text-5xl" aria-hidden="true">
          ⚠️
        </span>
        <h1 className="text-xl font-bold">Impossible d'ouvrir vos données</h1>
        <p>{error}</p>
        <Button onClick={() => window.location.reload()}>Réessayer</Button>
      </div>
    );
  }

  const draftAmount = pendingDraft ? validateAmount(pendingDraft.amount) : null;

  return (
    <>
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-xl focus:bg-white focus:p-3 dark:focus:bg-slate-900"
      >
        Aller au contenu
      </a>
      <main id="contenu" className="mx-auto max-w-lg px-4 pb-40 pt-[max(0.5rem,env(safe-area-inset-top))]">
        {!online && (
          <p
            role="status"
            className="mb-3 rounded-2xl bg-slate-800 px-3 py-2 text-center text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-950"
          >
            📴 Hors-ligne : tout fonctionne, vos dépenses sont enregistrées sur le téléphone.
          </p>
        )}
        {pendingDraft && !editor.open && (
          <div className="mb-3 flex items-center gap-2 rounded-2xl bg-amber-50 p-3 text-amber-950 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-50 dark:ring-amber-800">
            <p className="min-w-0 flex-1 text-sm">
              <strong>Saisie non terminée</strong>
              {draftAmount?.ok ? ` : ${formatFCFA(draftAmount.value)}` : ''}
            </p>
            <Button variant="secondary" className="text-sm" onClick={() => { clearDraft(NEW_EXPENSE_DRAFT); setPendingDraft(null); }}>
              Effacer
            </Button>
            <Button className="text-sm" onClick={openNew}>
              Reprendre
            </Button>
          </div>
        )}

        {route === 'accueil' && <HomePage onAdd={openNew} onEdit={openEdit} />}
        {route === 'depenses' && <ExpensesPage onAdd={openNew} onEdit={openEdit} />}
        {route === 'budgets' && <BudgetsPage />}
        {route === 'epargne' && <SavingsPage />}
        {route === 'reglages' && <SettingsPage />}
      </main>

      <button
        type="button"
        onClick={openNew}
        aria-label="Ajouter une dépense"
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-700 text-white shadow-xl shadow-emerald-900/30 hover:bg-emerald-800 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300 sm:right-[calc(50%-15rem)]"
      >
        <PlusIcon width={32} height={32} strokeWidth={2.5} />
      </button>

      <button
        type="button"
        onClick={() => setAssistantOpen(true)}
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-4 z-40 flex h-12 items-center gap-2 rounded-full bg-white px-4 font-semibold text-emerald-900 shadow-lg ring-1 ring-slate-200 hover:bg-emerald-50 dark:bg-slate-800 dark:text-emerald-100 dark:ring-slate-700 dark:hover:bg-slate-700 sm:left-[calc(50%-15rem)]"
      >
        <span aria-hidden="true">💬</span> Assistant
      </button>

      <BottomNav current={route} />

      {assistantOpen && (
        <AssistantSheet
          messages={assistantMessages}
          setMessages={setAssistantMessages}
          onClose={() => setAssistantOpen(false)}
          onEditExpense={(expense) => {
            setAssistantOpen(false);
            openEdit(expense);
          }}
        />
      )}
      {editor.open && <ExpenseFormModal expense={editor.expense} onClose={closeEditor} />}
    </>
  );
}
