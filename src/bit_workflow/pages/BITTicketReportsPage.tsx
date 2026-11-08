import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { format, parseISO, subDays } from 'date-fns';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileCheck2,
  Inbox,
  Radio,
  ShieldCheck,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Label, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { cn } from '@/lib/utils';
import { bitTicketApi } from '@/api/bitTicketApi';
import { getApiErrorMessage } from '@/api/bitChecklistApi';
import { UserAvatar } from '@/components/ui/user-avatar';
import type { BitTicketReport, TicketCategory, TicketPriority } from '../types/ticket';
import { CATEGORY_LABELS, PRIORITIES, PRIORITY_LABELS, formatDowntime, formatDuration } from '../utils/ticketUtils';

type Preset = '7' | '30' | '90' | 'custom';

const PRESETS: { id: Preset; label: string }[] = [
  { id: '7', label: 'Last 7 days' },
  { id: '30', label: 'Last 30 days' },
  { id: '90', label: 'Last 90 days' },
  { id: 'custom', label: 'Custom' },
];

const API_DATE = 'yyyy-MM-dd';

const PRIORITY_COLOR: Record<TicketPriority, string> = {
  critical: 'hsl(var(--destructive))',
  high: 'hsl(var(--warning))',
  medium: 'hsl(var(--info))',
  low: 'hsl(var(--muted-foreground))',
};

type KpiTone = 'primary' | 'info' | 'success' | 'warning' | 'destructive';

const KPI_TILE: Record<KpiTone, string> = {
  primary: 'bg-primary/10 text-primary',
  info: 'bg-info/10 text-info',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
};

const KPI_VALUE: Record<KpiTone, string> = {
  primary: 'text-foreground',
  info: 'text-foreground',
  success: 'text-foreground',
  warning: 'text-warning',
  destructive: 'text-destructive',
};

const dailyConfig = {
  created: { label: 'Created', color: 'hsl(var(--primary))' },
  resolved: { label: 'Resolved', color: 'hsl(var(--success))' },
} satisfies ChartConfig;

const countConfig = {
  count: { label: 'Tickets', color: 'hsl(var(--primary))' },
} satisfies ChartConfig;

function minutesLabel(minutes: number | null): string {
  return minutes == null ? '—' : formatDuration(minutes * 60000);
}

function slaTone(percent: number | null): KpiTone {
  if (percent == null) return 'primary';
  if (percent >= 90) return 'success';
  if (percent >= 75) return 'warning';
  return 'destructive';
}

function Kpi({
  icon: Icon,
  tone,
  label,
  value,
  caption,
  index,
}: {
  icon: LucideIcon;
  tone: KpiTone;
  label: string;
  value: string;
  caption: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
    >
      <Card className="h-full rounded-xl">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', KPI_TILE[tone])}>
              <Icon size={16} />
            </span>
          </div>
          <div className={cn('text-2xl font-semibold tabular-nums', KPI_VALUE[tone])}>{value}</div>
          <p className="text-xs text-muted-foreground">{caption}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ChartCard({
  title,
  description,
  className,
  index,
  children,
}: {
  title: string;
  description: string;
  className?: string;
  index: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.2 + index * 0.05 }}
    >
      <Card className="h-full rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  );
}

function EmptyState({ message, className }: { message: string; className?: string }) {
  return (
    <div className={cn('flex h-44 items-center justify-center text-center text-sm text-muted-foreground', className)}>
      {message}
    </div>
  );
}

function HorizontalBars({ data }: { data: { name: string; count: number }[] }) {
  const height = Math.max(160, data.length * 36 + 16);
  return (
    <ChartContainer config={countConfig} className="aspect-auto w-full" style={{ height }}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} barSize={18} />
      </BarChart>
    </ChartContainer>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="rounded-xl">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="rounded-xl lg:col-span-2">
          <CardContent className="p-6">
            <Skeleton className="mb-4 h-4 w-48" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-6">
            <Skeleton className="mb-4 h-4 w-32" />
            <Skeleton className="mx-auto h-48 w-48 rounded-full" />
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-6">
            <Skeleton className="mb-4 h-4 w-32" />
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
        <Card className="rounded-xl lg:col-span-2">
          <CardContent className="p-6">
            <Skeleton className="mb-4 h-4 w-40" />
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function BITTicketReportsPage() {
  usePageHeader('Ticket Reports', 'SLA performance, volume and workload');

  const [preset, setPreset] = useState<Preset>('30');
  const [customFrom, setCustomFrom] = useState(() => format(subDays(new Date(), 29), API_DATE));
  const [customTo, setCustomTo] = useState(() => format(new Date(), API_DATE));

  const { from, to } = useMemo(() => {
    if (preset === 'custom') return { from: customFrom, to: customTo };
    const today = new Date();
    return { from: format(subDays(today, Number(preset) - 1), API_DATE), to: format(today, API_DATE) };
  }, [preset, customFrom, customTo]);

  const rangeValid = Boolean(from) && Boolean(to) && to >= from;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['bit-ticket-reports', from, to],
    queryFn: () => bitTicketApi.reports(from, to),
    placeholderData: keepPreviousData,
    enabled: rangeValid,
  });

  const rangeText = rangeValid
    ? `${format(parseISO(from), 'd MMM')} – ${format(parseISO(to), 'd MMM yyyy')}`
    : 'Select a valid range';

  const errorMessage = error ? getApiErrorMessage(error, 'Failed to load reports. Please try again.') : null;

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-wrap items-center gap-3"
      >
        <div className="inline-flex flex-wrap rounded-lg border border-border bg-muted/50 p-0.5" role="group" aria-label="Date range">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={preset === p.id}
              onClick={() => setPreset(p.id)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                preset === p.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              aria-label="From date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-40"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              type="date"
              aria-label="To date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-40"
            />
          </div>
        )}
        <span className="ml-auto text-sm text-muted-foreground tabular-nums">{rangeText}</span>
      </motion.div>

      {rangeValid && isLoading && <ReportsSkeleton />}

      {!rangeValid && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Choose a start date that is on or before the end date.
        </p>
      )}

      {rangeValid && !isLoading && errorMessage && !data && (
        <Card className="rounded-xl">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <AlertCircle size={28} className="text-destructive" />
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {rangeValid && data && <ReportsContent data={data} />}
    </div>
  );
}

function ReportsContent({ data }: { data: BitTicketReport }) {
  const { totals } = data;
  const isEmpty = totals.created === 0 && totals.resolved === 0;

  const daily = useMemo(
    () => data.daily.map((d) => ({ ...d, label: format(parseISO(d.date), 'd MMM') })),
    [data.daily]
  );

  const priorityData = useMemo(() => {
    const counts = new Map(data.byPriority.map((p) => [p.key, p.count]));
    return PRIORITIES.map((p) => ({
      key: p,
      name: PRIORITY_LABELS[p],
      value: counts.get(p) ?? 0,
      fill: PRIORITY_COLOR[p],
    }));
  }, [data.byPriority]);
  const priorityTotal = priorityData.reduce((sum, p) => sum + p.value, 0);

  const categoryData = useMemo(
    () =>
      data.byCategory
        .filter((c) => c.count > 0)
        .map((c) => ({ name: CATEGORY_LABELS[c.key as TicketCategory] ?? c.key, count: c.count }))
        .sort((a, b) => b.count - a.count),
    [data.byCategory]
  );

  const vendorData = useMemo(
    () =>
      data.byVendor
        .filter((v) => v.count > 0)
        .map((v) => ({ name: v.vendorName, count: v.count }))
        .sort((a, b) => b.count - a.count),
    [data.byVendor]
  );

  const assignees = useMemo(() => [...data.byAssignee].sort((a, b) => b.open - a.open), [data.byAssignee]);

  const sla = totals.slaCompliancePercent;
  const onTime = totals.reportsOnTimePercent ?? null;
  const tickInterval = Math.max(0, Math.ceil(daily.length / 7) - 1);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          index={0}
          icon={Inbox}
          tone="primary"
          label="Created"
          value={totals.created.toLocaleString()}
          caption={`Currently open: ${totals.open.toLocaleString()}`}
        />
        <Kpi
          index={1}
          icon={CheckCircle2}
          tone="success"
          label="Resolved"
          value={totals.resolved.toLocaleString()}
          caption="In this range"
        />
        <Kpi
          index={2}
          icon={Timer}
          tone="info"
          label="Avg first response"
          value={minutesLabel(totals.avgFirstResponseMinutes)}
          caption="Time to first reaction"
        />
        <Kpi
          index={3}
          icon={Clock}
          tone="info"
          label="Avg resolution"
          value={minutesLabel(totals.avgResolutionMinutes)}
          caption="Created to resolved"
        />
        <Kpi
          index={4}
          icon={ShieldCheck}
          tone={slaTone(sla)}
          label="SLA compliance"
          value={sla == null ? '—' : `${Math.round(sla)}%`}
          caption="Response and resolve targets met"
        />
        <Kpi
          index={5}
          icon={Radio}
          tone={totals.onAirIncidents > 0 ? 'destructive' : 'primary'}
          label="On-air incidents"
          value={(totals.onAirIncidents ?? 0).toLocaleString()}
          caption="Tickets flagged with on-air impact"
        />
        <Kpi
          index={6}
          icon={Timer}
          tone="warning"
          label="On-air downtime"
          value={formatDowntime(totals.onAirDowntimeMinutes ?? 0)}
          caption="Total across incidents"
        />
        <Kpi
          index={7}
          icon={FileCheck2}
          tone={slaTone(onTime)}
          label="Reports on time"
          value={onTime == null ? '—' : `${Math.round(onTime)}%`}
          caption="Submitted within 12 h of restore"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <ChartCard
          index={0}
          className="lg:col-span-2"
          title="Created vs resolved"
          description="Daily ticket volume in the selected range"
        >
          {isEmpty ? (
            <EmptyState message="No tickets created or resolved in this range" className="h-64" />
          ) : (
            <ChartContainer config={dailyConfig} className="aspect-auto h-64 w-full">
              <AreaChart data={daily} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-created)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-created)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="fillResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-resolved)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-resolved)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval={tickInterval}
                />
                <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Area
                  dataKey="created"
                  type="monotone"
                  stroke="var(--color-created)"
                  strokeWidth={2}
                  fill="url(#fillCreated)"
                />
                <Area
                  dataKey="resolved"
                  type="monotone"
                  stroke="var(--color-resolved)"
                  strokeWidth={2}
                  fill="url(#fillResolved)"
                />
                <ChartLegend content={({ payload }) => <ChartLegendContent payload={payload} />} />
              </AreaChart>
            </ChartContainer>
          )}
        </ChartCard>

        <ChartCard index={1} title="By priority" description="Tickets created, by urgency">
          {priorityTotal === 0 ? (
            <EmptyState message="No tickets in this range" className="h-64" />
          ) : (
            <div className="space-y-4">
              <ChartContainer
                config={Object.fromEntries(priorityData.map((p) => [p.key, { label: p.name, color: p.fill }]))}
                className="mx-auto aspect-square h-44"
              >
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" />} />
                  <Pie
                    data={priorityData}
                    dataKey="value"
                    nameKey="key"
                    innerRadius="62%"
                    outerRadius="90%"
                    paddingAngle={2}
                    stroke="hsl(var(--card))"
                  >
                    {priorityData.map((p) => (
                      <Cell key={p.key} fill={p.fill} />
                    ))}
                    <Label
                      content={({ viewBox }) => {
                        if (!viewBox || !('cx' in viewBox)) return null;
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) - 6} className="fill-foreground text-2xl font-semibold">
                              {priorityTotal.toLocaleString()}
                            </tspan>
                            <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 14} className="fill-muted-foreground text-xs">
                              tickets
                            </tspan>
                          </text>
                        );
                      }}
                    />
                  </Pie>
                </PieChart>
              </ChartContainer>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {priorityData.map((p) => (
                  <li key={p.key} className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.fill }} />
                      {p.name}
                    </span>
                    <span className="font-medium tabular-nums text-foreground">{p.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ChartCard>

        <div className="space-y-5">
          <ChartCard index={2} title="By category" description="Where issues come from">
            {categoryData.length === 0 ? (
              <EmptyState message="No tickets in this range" />
            ) : (
              <HorizontalBars data={categoryData} />
            )}
          </ChartCard>
          <ChartCard index={3} title="Escalations by vendor" description="Tickets linked to a vendor">
            {vendorData.length === 0 ? (
              <EmptyState message="No vendor escalations in this range" className="h-28" />
            ) : (
              <HorizontalBars data={vendorData} />
            )}
          </ChartCard>
        </div>

        <ChartCard
          index={4}
          className="lg:col-span-2"
          title="Assignee workload"
          description="Open tickets and resolution speed per team member"
        >
          {assignees.length === 0 ? (
            <EmptyState message="No assigned tickets in this range" className="h-64" />
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <Table className="[&_th]:border-r [&_td]:border-r [&_th]:border-border/70 [&_td]:border-border/70 [&_th:last-child]:border-r-0 [&_td:last-child]:border-r-0">
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Assignee
                    </TableHead>
                    <TableHead className="h-10 w-24 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Open
                    </TableHead>
                    <TableHead className="h-10 w-24 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Resolved
                    </TableHead>
                    <TableHead className="h-10 w-36 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Avg resolution
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignees.map((a) => (
                    <TableRow key={a.userId}>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar name={a.name} />
                          <span className="text-sm font-medium text-foreground">{a.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-right tabular-nums">{a.open}</TableCell>
                      <TableCell className="py-3 text-right tabular-nums">{a.resolved}</TableCell>
                      <TableCell className="py-3 text-right tabular-nums text-muted-foreground">
                        {minutesLabel(a.avgResolutionMinutes)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
