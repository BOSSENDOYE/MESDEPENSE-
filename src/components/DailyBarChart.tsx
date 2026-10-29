import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { usePrefersDark } from '../hooks/usePrefersDark';
import type { ISODate, MonthKey } from '../types';
import { formatMonthName } from '../utils/dates';
import { formatCompact, formatFCFA } from '../utils/money';
import type { DailyTotal } from '../utils/stats';
import { mutedText } from './ui';

interface DailyBarChartProps {
  data: readonly DailyTotal[];
  month: MonthKey;
  /** Moyenne par jour écoulé, tracée en pointillés. */
  average: number;
  today: ISODate;
}

export function DailyBarChart({ data, month, average, today }: DailyBarChartProps) {
  const dark = usePrefersDark();
  const monthName = formatMonthName(month);
  const ink = dark ? '#94a3b8' : '#475569';
  const grid = dark ? '#1e293b' : '#e2e8f0';
  const barColor = dark ? '#34d399' : '#047857';
  const todayColor = dark ? '#fbbf24' : '#b45309';
  const peak = data.reduce<DailyTotal | null>((best, d) => (d.total > (best?.total ?? 0) ? d : best), null);
  const activeDays = data.filter((d) => d.total > 0).length;

  return (
    <div>
      <div className="h-52" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...data]} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke={grid} />
            <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: grid }} tick={{ fill: ink, fontSize: 12 }} interval={4} />
            <YAxis
              tickFormatter={(v: number) => formatCompact(v)}
              tickLine={false}
              axisLine={false}
              tick={{ fill: ink, fontSize: 12 }}
              width={44}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: dark ? 'rgb(148 163 184 / 0.15)' : 'rgb(100 116 139 / 0.12)' }}
              labelFormatter={(label) => `${String(label)} ${monthName}`}
              formatter={(value) => [typeof value === 'number' ? formatFCFA(value) : String(value), 'Dépensé']}
              contentStyle={{
                borderRadius: 12,
                border: 'none',
                backgroundColor: dark ? '#1e293b' : '#ffffff',
                color: dark ? '#f1f5f9' : '#0f172a',
                boxShadow: '0 4px 16px rgb(0 0 0 / 0.15)',
              }}
            />
            {average > 0 && <ReferenceLine y={average} stroke={ink} strokeDasharray="4 4" strokeWidth={1.5} />}
            <Bar dataKey="total" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.day} fill={d.date === today ? todayColor : barColor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className={`mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${mutedText}`}>
        {average > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 border-t-2 border-dashed border-current" aria-hidden="true" />
            Moyenne : {formatFCFA(average)} / jour
          </span>
        )}
        {data.some((d) => d.date === today) && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: todayColor }} aria-hidden="true" />
            Aujourd'hui
          </span>
        )}
      </div>
      <p className={`mt-1 text-sm ${mutedText}`}>
        {peak
          ? `${activeDays} jour${activeDays > 1 ? 's' : ''} avec dépenses · pic le ${peak.day} ${monthName} (${formatFCFA(peak.total)})`
          : 'Aucune dépense ce mois-ci.'}
      </p>
    </div>
  );
}
