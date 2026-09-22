import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileStack, CheckCircle2, RotateCcw, Clock3 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatTile } from '../components/StatTile';
import { useHRChartColors } from '../utils/chartColors';
import { hrApi } from '../api/hrApi';
import { useHrLanguage, bilingual } from '../context/HrLanguageContext';
import { formatDate, CONTRACT_STATUS_LABEL, CONTRACT_STATUS_BADGE_CLASS } from '../utils/hrUtils';
import type { HrContractStatus } from '../types/hrApi';

// Every stage a freelance contract renewal actually moves through, in order —
// drives both the "by stage" chart and which statuses count as "in progress".
const STAGE_ORDER: HrContractStatus[] = [
  'AwaitingEmployeeSignature',
  'AwaitingDepartmentHeadSignature',
  'AwaitingFinalSignature',
  'Completed',
  'Returned',
];

/** Real numbers pulled from the Contract Renewal module — one "request" is
 * one HrContract (a freelance employee's renewal cycle), the same data the
 * Contract Renewal list and status tracker are built on. No mock/seed data. */
export function HiringReportsPage() {
  const colors = useHRChartColors();
  const { language, t } = useHrLanguage();

  const employeesQuery = useQuery({
    queryKey: ['hr-employees', 'Freelance', 'hiring-reports'],
    queryFn: () => hrApi.searchEmployees({ contractType: 'Freelance', page: 1, pageSize: 2000 }),
  });

  const employees = employeesQuery.data?.items ?? [];
  const employeeIds = employees.map((e) => e.id);

  const contractsQuery = useQuery({
    queryKey: ['hr-contracts-by-employees', 'hiring-reports', employeeIds.join(',')],
    queryFn: () => hrApi.getLatestContractsForEmployees(employeeIds),
    enabled: employeeIds.length > 0,
  });

  const contracts = contractsQuery.data ?? [];
  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const isLoading = employeesQuery.isLoading || (employeeIds.length > 0 && contractsQuery.isLoading);
  const isError = employeesQuery.isError || contractsQuery.isError;

  const byDepartment = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of contracts) {
      const emp = employeeById.get(c.employeeId);
      const label = emp ? bilingual(language, emp.departmentNameEn, emp.departmentNameAr) : 'Unknown';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count);
  }, [contracts, employeeById, language]);

  const byStage = useMemo(
    () =>
      STAGE_ORDER.map((status) => ({
        stage: CONTRACT_STATUS_LABEL[status],
        status,
        count: contracts.filter((c) => c.status === status).length,
      })).filter((s) => s.count > 0),
    [contracts]
  );

  const total = contracts.length;
  const completed = contracts.filter((c) => c.status === 'Completed').length;
  const returned = contracts.filter((c) => c.status === 'Returned').length;
  const inProgress = contracts.filter((c) => c.status !== 'Completed' && c.status !== 'Returned').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (isError) {
    return <div className="text-center py-16 text-muted-foreground">{t('errorLoading')}</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Hiring Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Freelance contract renewal volume, stage distribution, and outcomes
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile label="Total Requests" value={total} icon={FileStack} />
        <StatTile label="In Progress" value={inProgress} icon={Clock3} accentClassName="bg-warning/15 text-warning" />
        <StatTile label="Completed" value={completed} icon={CheckCircle2} accentClassName="bg-success/15 text-success" />
        <StatTile
          label="Returned Rate"
          value={`${total ? Math.round((returned / total) * 100) : 0}%`}
          icon={RotateCcw}
          accentClassName="bg-destructive/15 text-destructive"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Requests by Department</CardTitle>
            <CardDescription>Contract renewal volume per department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {byDepartment.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No contract renewals started yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byDepartment} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
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
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: colors.muted }} stroke={colors.axis} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'rgba(128,128,128,0.08)' }} />
                    <Bar dataKey="count" fill={colors.permanent} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Requests by Current Stage</CardTitle>
            <CardDescription>Where active renewals sit in the signing chain</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {byStage.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No contract renewals started yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byStage} layout="vertical" margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: colors.muted }} stroke={colors.axis} />
                    <YAxis
                      type="category"
                      dataKey="stage"
                      width={130}
                      tick={{ fontSize: 11, fill: colors.muted }}
                      stroke={colors.axis}
                    />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'rgba(128,128,128,0.08)' }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {byStage.map((s) => (
                        <Cell
                          key={s.status}
                          fill={s.status === 'Returned' ? colors.critical : s.status === 'Completed' ? colors.good : colors.warning}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All Contract Renewals</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request #</TableHead>
                <TableHead>Candidate</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Stage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    No contract renewals started yet.
                  </TableCell>
                </TableRow>
              )}
              {contracts
                .slice()
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((c) => {
                  const emp = employeeById.get(c.employeeId);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        HR-{new Date(c.createdAt).getFullYear()}-{String(c.id).padStart(4, '0')}
                      </TableCell>
                      <TableCell>{emp ? bilingual(language, emp.fullNameEn, emp.fullNameAr) : '—'}</TableCell>
                      <TableCell>{emp ? bilingual(language, emp.departmentNameEn, emp.departmentNameAr) : '—'}</TableCell>
                      <TableCell>{formatDate(c.createdAt)}</TableCell>
                      <TableCell>
                        <Badge className={CONTRACT_STATUS_BADGE_CLASS[c.status]}>{CONTRACT_STATUS_LABEL[c.status]}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
