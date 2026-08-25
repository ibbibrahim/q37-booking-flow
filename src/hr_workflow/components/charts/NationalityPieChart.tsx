import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useHrLanguage } from '../../context/HrLanguageContext';
import type { HrEmployee } from '../../types/hrApi';

interface Props {
  employees: HrEmployee[];
}

// A dedicated qualitative palette — distinct professional hues so adjacent
// nationalities never render as the same color the way reusing the app's
// 2-tone permanent/freelance palette did. Cycled if there are more
// nationalities than colors.
const PALETTE = [
  '#3b6fd1', // blue
  '#2f9e6f', // teal green
  '#d1a13b', // amber
  '#7c5ec9', // violet
  '#c14f5f', // muted red
  '#3fa3b8', // cyan
  '#c17a3f', // terracotta
  '#6b8e23', // olive
  '#b0559c', // magenta
  '#4c6b8a', // slate blue
  '#a68a3f', // gold
  '#5c8f6e', // sage
];

export function NationalityPieChart({ employees }: Props) {
  const { t } = useHrLanguage();
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  // Nationality isn't captured for every record yet (freelancers especially) — only
  // count where it's actually known, so "unknown" doesn't get silently folded into
  // a real nationality bucket.
  const withNationality = employees.filter((e) => !!e.nationality);

  const counts = withNationality.reduce<Record<string, number>>((acc, e) => {
    const key = e.nationality as string;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  const data = sorted.map(([name, value], i) => ({
    name,
    value,
    color: PALETTE[i % PALETTE.length],
  }));

  const visibleData = data.filter((d) => !hidden.has(d.name));

  const toggleNationality = (name: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('nationalityBreakdown')}</CardTitle>
        <CardDescription>
          {t('nationalityBreakdownDesc')} ({withNationality.length}/{employees.length})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={visibleData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                isAnimationActive={false}
              >
                {visibleData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`${value} employees`, name]}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Custom clickable legend — clicking a nationality toggles it out of the
            donut, same as the standard "click legend to isolate" pattern. */}
        <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-2 max-h-28 overflow-y-auto px-1">
          {data.map((d) => {
            const isHidden = hidden.has(d.name);
            return (
              <li key={d.name}>
                <button
                  type="button"
                  onClick={() => toggleNationality(d.name)}
                  className="flex items-center gap-1.5 text-xs select-none"
                  style={{ opacity: isHidden ? 0.4 : 1 }}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: d.color }}
                  />
                  <span style={{ textDecoration: isHidden ? 'line-through' : 'none' }}>{d.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
