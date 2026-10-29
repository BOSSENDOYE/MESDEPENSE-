import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { usePrefersDark } from '../hooks/usePrefersDark';
import type { Category } from '../types';
import { formatCompact, formatFCFA, formatPercent } from '../utils/money';
import type { CategoryShare } from '../utils/stats';
import { CategoryIcon } from './CategoryIcon';
import { mutedText } from './ui';

interface CategoryPieChartProps {
  shares: readonly CategoryShare[];
  getCategory: (id: string) => Category;
  total: number;
}

export function CategoryPieChart({ shares, getCategory, total }: CategoryPieChartProps) {
  const dark = usePrefersDark();
  const data = shares.map((s) => {
    const category = getCategory(s.categoryId);
    return { id: s.categoryId, name: category.name, value: s.total, share: s.share, color: category.color, category };
  });

  return (
    <div>
      <div className="relative h-56" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="64%"
              outerRadius="96%"
              cornerRadius={4}
              paddingAngle={data.length > 1 ? 2 : 0}
              stroke={dark ? '#0f172a' : '#ffffff'}
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.id} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => (typeof value === 'number' ? formatFCFA(value) : String(value))}
              contentStyle={{
                borderRadius: 12,
                border: 'none',
                backgroundColor: dark ? '#1e293b' : '#ffffff',
                color: dark ? '#f1f5f9' : '#0f172a',
                boxShadow: '0 4px 16px rgb(0 0 0 / 0.15)',
              }}
              itemStyle={{ color: dark ? '#f1f5f9' : '#0f172a' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-xs font-medium ${mutedText}`}>Total</span>
          <span className="text-2xl font-bold tabular-nums">{formatCompact(total)}</span>
          <span className={`text-xs ${mutedText}`}>FCFA</span>
        </div>
      </div>
      {/* Légende = vue texte accessible du graphique (l'identité ne repose jamais sur la seule couleur). */}
      <ul className="mt-3 space-y-3" aria-label="Répartition par catégorie">
        {data.map((d) => (
          <li key={d.id} className="flex items-center gap-3">
            <CategoryIcon category={d.category} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium">{d.name}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{formatFCFA(d.value)}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
                  <div className="h-full rounded-full" style={{ width: `${d.share * 100}%`, backgroundColor: d.color }} />
                </div>
                <span className={`w-10 text-right text-xs tabular-nums ${mutedText}`}>{formatPercent(d.share * 100)}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
