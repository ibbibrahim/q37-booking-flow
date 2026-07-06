import { useMemo } from 'react';
import { FileStack, CheckCircle2, RotateCcw, Clock3 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatTile } from '../components/StatTile';
import { useHRChartColors } from '../utils/chartColors';
import { departments } from '../data/departments';
import { hiringRequests } from '../data/hiringRequestsSeed';
import { HIRING_STAGES, formatDate, hiringStageBadgeClass } from '../utils/hrUtils';
import type { HiringRequestStage } from '../types/hr';

const ALL_STAGES: HiringRequestStage[] = [...HIRING_STAGES, 'Returned to Department'];

export function HiringReportsPage() {
  const colors = useHRChartColors();

  const byDepartment = useMemo(
    () =>
      departments
        .map((dept) => ({
          department: dept.name,
          count: hiringRequests.filter((r) => r.departmentId === dept.id).length,
        }))
        .filter((d) => d.count > 0)
        .sort((a, b) => b.count - a.count),
    []
  );

  const byStage = useMemo(
    () =>
      ALL_STAGES.map((stage) => ({
        stage,
        count: hiringRequests.filter((r) => r.stage === stage).length,
      })).filter((s) => s.count > 0),
    []
  );

  const total = hiringRequests.length;
  const completed = hiringRequests.filter((r) => r.status === 'Approved').length;
  const returned = hiringRequests.filter((r) => r.status === 'Returned').length;
  const inProgress = hiringRequests.filter((r) => r.status === 'In Progress').length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Hiring Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Hiring request volume, stage distribution, and outcomes</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile label="Total Requests" value={total} icon={FileStack} />
        <StatTile label="In Progress" value={inProgress} icon={Clock3} accentClassName="bg-warning/15 text-warning" />
        <StatTile label="Completed" value={completed} icon={CheckCircle2} accentClassName="bg-success/15 text-success" />
        <StatTile label="Returned Rate" value={`${total ? Math.round((returned / total) * 100) : 0}%`} icon={RotateCcw} accentClassName="bg-destructive/15 text-destructive" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Requests by Department</CardTitle>
            <CardDescription>Hiring request volume per department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Requests by Current Stage</CardTitle>
            <CardDescription>Where active requests sit in the approval chain</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
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
                      <Cell key={s.stage} fill={s.stage === 'Returned to Department' ? colors.critical : colors.freelance} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All Hiring Requests</CardTitle>
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
              {hiringRequests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.requestNumber}</TableCell>
                  <TableCell>{r.candidateName}</TableCell>
                  <TableCell>{departments.find((d) => d.id === r.departmentId)?.name}</TableCell>
                  <TableCell>{formatDate(r.createdDate)}</TableCell>
                  <TableCell>
                    <Badge className={hiringStageBadgeClass(r.stage)}>{r.stage}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
