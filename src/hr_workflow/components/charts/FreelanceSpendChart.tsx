import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHRChartColors } from '../../utils/chartColors';
import { departments } from '../../data/departments';
import { financeData, monthOptions } from '../../data/financeSeed';
import { formatCurrencyQAR } from '../../utils/hrUtils';

export function FreelanceSpendChart() {
  const colors = useHRChartColors();
  const months = monthOptions();
  const [selectedMonth, setSelectedMonth] = useState(months[months.length - 1]);

  const data = useMemo(() => {
    return departments.map((dept) => {
      const entry = financeData.find((f) => f.month === selectedMonth && f.departmentId === dept.id);
      return { department: dept.name, spend: entry?.freelanceSpend ?? 0 };
    });
  }, [selectedMonth]);

  const total = data.reduce((sum, d) => sum + d.spend, 0);

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">Freelance Spend by Department</CardTitle>
          <CardDescription>Monthly freelance cost — total {formatCurrencyQAR(total)}</CardDescription>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis
                dataKey="department"
                tick={{ fontSize: 11, fill: colors.muted }}
                angle={-35}
                textAnchor="end"
                interval={0}
                height={70}
                stroke={colors.axis}
              />
              <YAxis
                tick={{ fontSize: 12, fill: colors.muted }}
                stroke={colors.axis}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value) => [formatCurrencyQAR(Number(value)), 'Freelance spend']}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
                cursor={{ fill: 'rgba(128,128,128,0.08)' }}
              />
              <Bar dataKey="spend" fill={colors.sequential} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
