import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet, TrendingUp, Building2 } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { DATA_TABLE_WRAPPER, DATA_TABLE_GRID, DATA_TABLE_HEADER_ROW, DATA_TABLE_HEAD, DATA_TABLE_ROW } from '@/lib/tableStyles';
import { StatTile } from '../components/StatTile';
import { FreelanceSpendChart } from '../components/charts/FreelanceSpendChart';
import { useHRChartColors } from '../utils/chartColors';
import { departments } from '../data/departments';
import { financeData, monthOptions } from '../data/financeSeed';
import { formatCurrencyQAR } from '../utils/hrUtils';
import { hrApi } from '../api/hrApi';
import { usePageHeader } from '@/contexts/PageHeaderContext';

export function FinancialReportsPage() {
  const colors = useHRChartColors();
  const months = monthOptions();

  const departmentsQuery = useQuery({
    queryKey: ['hr-departments'],
    queryFn: hrApi.getDepartments,
    staleTime: 5 * 60 * 1000,
  });
  const employeesQuery = useQuery({
    queryKey: ['hr-employees-dashboard'],
    queryFn: () => hrApi.searchEmployees({ page: 1, pageSize: 2000 }),
  });

  const trend = useMemo(
    () =>
      months.map((month) => ({
        month,
        total: financeData.filter((f) => f.month === month).reduce((s, f) => s + f.freelanceSpend, 0),
      })),
    [months]
  );

  const currentMonth = months[months.length - 1];
  const currentMonthTotal = trend[trend.length - 1]?.total ?? 0;
  const avgMonthlySpend = Math.round(trend.reduce((s, t) => s + t.total, 0) / (trend.length || 1));

  const byDepartment = useMemo(
    () =>
      departments
        .map((dept) => {
          const totalForDept = financeData.filter((f) => f.departmentId === dept.id).reduce((s, f) => s + f.freelanceSpend, 0);
          return { dept, totalForDept };
        })
        .sort((a, b) => b.totalForDept - a.totalForDept),
    []
  );

  const topDepartment = byDepartment[0]?.dept.name ?? '—';

  usePageHeader('Financial Reports', 'Freelance spend across departments, tracked monthly');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile label={`Spend — ${currentMonth}`} value={formatCurrencyQAR(currentMonthTotal)} icon={Wallet} />
        <StatTile label="Avg. Monthly Spend (6mo)" value={formatCurrencyQAR(avgMonthlySpend)} icon={TrendingUp} />
        <StatTile label="Highest Spending Department" value={topDepartment} icon={Building2} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">6-Month Freelance Spend Trend</CardTitle>
          <CardDescription>Total freelance cost across all departments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: colors.muted }} stroke={colors.axis} />
                <YAxis
                  tick={{ fontSize: 12, fill: colors.muted }}
                  stroke={colors.axis}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value) => [formatCurrencyQAR(Number(value)), 'Total spend']}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="total" stroke={colors.sequential} strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <FreelanceSpendChart
        employees={employeesQuery.data?.items.filter((e) => e.status === 'Active') ?? []}
        departments={departmentsQuery.data ?? []}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Spend by Department (6-Month Total)</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className={DATA_TABLE_WRAPPER}>
            <div className="overflow-x-auto">
              <Table className={cn(DATA_TABLE_GRID, 'min-w-[480px]')}>
                <TableHeader>
                  <TableRow className={DATA_TABLE_HEADER_ROW}>
                    <TableHead className={DATA_TABLE_HEAD}>Department</TableHead>
                    <TableHead className={cn(DATA_TABLE_HEAD, 'text-right')}>6-Month Total</TableHead>
                    <TableHead className={cn(DATA_TABLE_HEAD, 'text-right')}>Monthly Average</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byDepartment.map(({ dept, totalForDept }) => (
                    <TableRow key={dept.id} className={DATA_TABLE_ROW}>
                      <TableCell className="py-3 font-medium">{dept.name}</TableCell>
                      <TableCell className="py-3 text-right tabular-nums">{formatCurrencyQAR(totalForDept)}</TableCell>
                      <TableCell className="py-3 text-right tabular-nums">
                        {formatCurrencyQAR(Math.round(totalForDept / (months.length || 1)))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
