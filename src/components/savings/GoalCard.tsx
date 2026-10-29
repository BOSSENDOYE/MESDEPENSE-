import type { SavingsGoal } from '../../types';
import { formatMonthLabel } from '../../utils/dates';
import { formatFCFA, formatPercent } from '../../utils/money';
import type { GoalPlan } from '../../utils/savings';
import { mutedText } from '../ui';

/** Barre d'avancement d'un objectif d'épargne. */
export function GoalProgress({ goal, plan }: { goal: SavingsGoal; plan: GoalPlan }) {
  if (plan.percent === null || goal.target === null) return null;
  const text = plan.reached
    ? `Objectif atteint (${formatFCFA(plan.balance)})`
    : `${formatPercent(plan.percent)} · reste ${formatFCFA(plan.remaining ?? 0)}`;
  return (
    <div>
      <div
        role="progressbar"
        aria-label={`Avancement ${goal.name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(plan.percent)}
        aria-valuetext={text}
        className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
      >
        <div
          className={`h-full rounded-full ${plan.reached ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-teal-600 dark:bg-teal-400'}`}
          style={{ width: `${Math.max(plan.percent > 0 ? 3 : 0, plan.percent)}%` }}
        />
      </div>
      <p className={`mt-1 text-sm ${plan.reached ? 'font-semibold text-emerald-800 dark:text-emerald-300' : mutedText}`}>
        {plan.reached ? '🎉 ' : ''}
        {text}
      </p>
    </div>
  );
}

/** Conseil sous l'objectif : effort mensuel, échéance dépassée, versement automatique. */
export function GoalAdvice({ goal, plan }: { goal: SavingsGoal; plan: GoalPlan }) {
  const lines: { text: string; tone: 'info' | 'warning' }[] = [];
  if (plan.late) {
    lines.push({ text: `⚠ Échéance (${formatMonthLabel(goal.deadline ?? '')}) dépassée : il manque ${formatFCFA(plan.remaining ?? 0)}.`, tone: 'warning' });
  } else if (plan.perMonth !== null && goal.deadline) {
    lines.push({ text: `👉 ${formatFCFA(plan.perMonth)} par mois jusqu'en ${formatMonthLabel(goal.deadline).toLocaleLowerCase('fr-FR')}`, tone: 'info' });
  }
  if (goal.auto?.active) {
    const short = plan.perMonth !== null && goal.auto.amount < plan.perMonth;
    lines.push({
      text: `🔁 ${formatFCFA(goal.auto.amount)} le ${goal.auto.dayOfMonth} de chaque mois${short ? ' (un peu juste pour l’échéance)' : ''}`,
      tone: short ? 'warning' : 'info',
    });
  }
  if (lines.length === 0) return null;
  return (
    <ul className="space-y-0.5">
      {lines.map((l) => (
        <li key={l.text} className={`text-sm ${l.tone === 'warning' ? 'font-medium text-amber-800 dark:text-amber-300' : mutedText}`}>
          {l.text}
        </li>
      ))}
    </ul>
  );
}
