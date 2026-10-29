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

// Qatar flag maroon — lightened from the official #8A1538 just enough to
// clear the chart-mark lightness band (validated with the dataviz skill's
// palette checker: the official hex is too dark/low-contrast to read well
// as a thin donut arc). Used for "Qatari" in BOTH donuts on this card, so
// the identity stays one color everywhere rather than inheriting whatever
// PALETTE slot the sort order happens to assign it. Non-Qatari reuses the
// terracotta already in PALETTE rather than a true gray, since flat gray
// fails the categorical chroma/contrast floor (reads as "no category" at
// that low a saturation, not as a deliberate second identity) — this pair
// passes all checks in both light and dark mode.
const QATARI_COLOR = '#8A1538';
const NON_QATARI_COLOR = '#c17a3f';

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

  // "Qatari" always gets the flag-maroon constant rather than whatever
  // PALETTE slot its sort position lands on, so it matches the mini donut
  // on the right regardless of how the nationality mix shifts over time.
  // Every other nationality draws from PALETTE in order, skipping index 0
  // (reserved for Qatari's old slot) so the remaining hues stay distinct.
  let paletteIndex = 0;
  const data = sorted.map(([name, value]) => {
    if (name === 'Qatari') return { name, value, color: QATARI_COLOR };
    const color = PALETTE[(paletteIndex % (PALETTE.length - 1)) + 1];
    paletteIndex += 1;
    return { name, value, color };
  });

  const visibleData = data.filter((d) => !hidden.has(d.name));

  const qatariCount = withNationality.filter((e) => e.nationality === 'Qatari').length;
  const nonQatariCount = withNationality.length - qatariCount;
  const pct = (n: number) => (withNationality.length ? Math.round((n / withNationality.length) * 100) : 0);
  const qatariSplit = [
    { name: t('qatari'), value: qatariCount, color: QATARI_COLOR },
    { name: t('nonQatari'), value: nonQatariCount, color: NON_QATARI_COLOR },
  ];

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
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 min-w-0">
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
                    formatter={(value, name) => [`${value} employees (${pct(value as number)}%)`, name]}
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
          </div>

          {/* Qatari vs Non-Qatari — small companion donut, same card, same
              Qatari color as its slice in the main chart on the left. */}
          <div className="sm:w-44 shrink-0 border-t sm:border-t-0 sm:border-l border-border pt-4 sm:pt-0 sm:pl-4 flex flex-col">
            <p className="text-xs font-semibold text-foreground mb-2">{t('qatariVsNonQatari')}</p>
            <div className="h-24" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={qatariSplit}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={26}
                    outerRadius={40}
                    paddingAngle={3}
                    isAnimationActive={false}
                  >
                    {qatariSplit.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} employees (${pct(value as number)}%)`, name]}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2 mt-1">
              {qatariSplit.map((d) => (
                <li key={d.name}>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                    <span>{d.name}</span>
                  </div>
                  <div className="text-sm font-semibold text-card-foreground tabular-nums pl-4">
                    {d.value} <span className="text-xs text-muted-foreground font-normal">({pct(d.value)}%)</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
