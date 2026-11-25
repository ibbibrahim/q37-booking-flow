import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { addMonths, format, parse, subMonths } from 'date-fns';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Download,
  Film,
  Loader2,
  Radio,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/lib/utils';
import { managementReportApi } from '@/api/managementReportApi';
import { getApiErrorMessage } from '@/api/bitChecklistApi';
import type { AvailabilityBlock, ManagementReport } from '../types/managementReport';
import { ticketPath } from '../utils/engineeringPaths';

const MONTH_FORMAT = 'yyyy-MM';

type ReportTab = 'availability' | 'operations';

const REPORT_TABS: { key: ReportTab; label: string; subtitle: string }[] = [
  { key: 'availability', label: 'Channel Availability Report', subtitle: 'On-air availability and incidents' },
  { key: 'operations', label: 'Channel Operations Report', subtitle: 'DTL guests and call-sheet shoots' },
];

function formatMinutes(m: number): string {
  if (m <= 0) return '0 min';
  const total = Math.round(m);
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0 ? `${h} h` : `${h} h ${rest} min`;
}

function parseMonth(month: string): Date {
  return parse(month, MONTH_FORMAT, new Date());
}

function formatQar(n: number): string {
  return `QAR ${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

function Reveal({ index, className, children }: { index: number; className?: string; children: React.ReactNode }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      {children}
    </motion.div>
  );
}

function IconChip({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
      <Icon size={18} />
    </div>
  );
}

function SectionCard({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="h-full rounded-2xl border-border/70 shadow-sm">
      <div className="flex items-center gap-3 px-6 pt-6">
        <IconChip icon={icon} />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-tight text-foreground">{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <CardContent className="space-y-6 p-6">{children}</CardContent>
    </Card>
  );
}

function Metric({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="min-w-0 sm:border-l sm:border-border sm:pl-6 first:border-l-0 first:pl-0">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn('mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground', tone)}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

const STRIP_COLS = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
  5: 'sm:grid-cols-5',
} as const;

function StatStrip({ cols, children }: { cols: keyof typeof STRIP_COLS; children: React.ReactNode }) {
  return <div className={cn('grid grid-cols-2 gap-x-6 gap-y-5 sm:gap-x-0', STRIP_COLS[cols])}>{children}</div>;
}

function SubHead({ children }: { children: React.ReactNode }) {
  return <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</h4>;
}

function SplitBar({ segments }: { segments: { label: string; value: number; className: string }[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div key={s.label} className={cn('h-full', s.className)} style={{ width: `${(s.value / total) * 100}%` }} />
          ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', s.className)} />
            {s.label}
            <span className="font-medium tabular-nums text-foreground">{s.value.toLocaleString()}</span>
            <span className="tabular-nums">({((s.value / total) * 100).toFixed(0)}%)</span>
          </span>
        ))}
      </div>
    </div>
  );
}

interface RankedRow {
  name: string;
  primary: string;
  secondary?: string;
  weight: number;
}

function RankedList({ rows, max }: { rows: RankedRow[]; max?: number }) {
  const ceiling = max ?? Math.max(...rows.map((r) => r.weight), 1);
  return (
    <ul className="space-y-3.5">
      {rows.map((r) => (
        <li key={r.name} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-sm font-medium text-foreground">{r.name}</span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{r.primary}</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/70"
              style={{ width: `${Math.min(100, (r.weight / ceiling) * 100)}%` }}
            />
          </div>
          {r.secondary && <div className="text-xs text-muted-foreground">{r.secondary}</div>}
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ icon: Icon, title, hint, iconClassName }: { icon: LucideIcon; title: string; hint: string; iconClassName?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 py-10 text-center">
      <Icon size={28} className={cn('mb-1 text-muted-foreground', iconClassName)} />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

type DonutKey = 'available' | 'delay' | 'cancelled';

// Smallest ring fraction that still reads, so a few minutes of delay stay visible.
const MIN_SEGMENT = 0.03;

interface DonutSegment {
  key: DonutKey;
  label: string;
  percent: number;
  minutes: number;
  countLabel: string;
  strokeClass: string;
  dotClass: string;
  textClass: string;
  frac: number;
}

function buildSegments(block: AvailabilityBlock): DonutSegment[] {
  const availableMinutes = Math.max(0, block.liveMinutes - block.downtimeMinutes - block.cancelledMinutes);
  const fracOf = (minutes: number) => {
    if (block.liveMinutes <= 0 || minutes <= 0) return 0;
    return Math.max(minutes / block.liveMinutes, MIN_SEGMENT);
  };
  const delayFrac = fracOf(block.downtimeMinutes);
  const cancelledFrac = fracOf(block.cancelledMinutes);
  return [
    {
      key: 'available',
      label: 'Available',
      percent: block.availabilityPercent,
      minutes: availableMinutes,
      countLabel: `${Math.floor(availableMinutes / 60).toLocaleString()} h`,
      strokeClass: 'stroke-success',
      dotClass: 'bg-success',
      textClass: 'text-success',
      frac: Math.max(0, 1 - delayFrac - cancelledFrac),
    },
    {
      key: 'delay',
      label: 'Delay/Cancelled',
      percent: block.downtimePercent,
      minutes: block.downtimeMinutes,
      countLabel: `${block.incidentCount.toLocaleString()} ${block.incidentCount === 1 ? 'incident' : 'incidents'}`,
      strokeClass: 'stroke-warning',
      dotClass: 'bg-warning',
      textClass: 'text-warning',
      frac: delayFrac,
    },
    {
      key: 'cancelled',
      label: 'On Air Black / No Audio',
      percent: block.cancelledPercent,
      minutes: block.cancelledMinutes,
      countLabel: `${block.cancelledCount.toLocaleString()} ${block.cancelledCount === 1 ? 'incident' : 'incidents'}`,
      strokeClass: 'stroke-destructive',
      dotClass: 'bg-destructive',
      textClass: 'text-destructive',
      frac: cancelledFrac,
    },
  ];
}

/**
 * Donut: green = available, orange = delay (downtime), red = cancelled programmes.
 * The centre shows availability; hovering a segment (or its legend row) widens it,
 * dims the others and shows that segment's figure in the centre instead.
 */
function AvailabilityDonut({
  segments,
  availability,
  active,
  onActiveChange,
}: {
  segments: DonutSegment[];
  availability: number;
  active: DonutKey | null;
  onActiveChange: (key: DonutKey | null) => void;
}) {
  const size = 160;
  const stroke = 18;
  const r = (size - 22) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const drawn = segments.filter((s) => s.frac > 0);
  const gap = drawn.length >= 2 ? 1.5 / 360 : 0;
  const activeSeg = segments.find((s) => s.key === active) ?? null;

  let startFrac = 0;
  const arcs = drawn.map((s, index) => {
    const arc = { seg: s, index, start: startFrac, len: Math.max(s.frac - gap, 0.002) };
    startFrac += s.frac;
    return arc;
  });

  return (
    <motion.div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      onMouseLeave={() => onActiveChange(null)}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 overflow-visible" aria-hidden="true">
        {arcs.map(({ seg, index, start, len }) => (
          <motion.circle
            key={seg.key}
            cx={c}
            cy={c}
            r={r}
            fill="none"
            transform={`rotate(${start * 360} ${c} ${c})`}
            className={cn('cursor-pointer', seg.strokeClass)}
            initial={{ strokeDasharray: `0 ${circumference}`, strokeWidth: stroke, opacity: 1 }}
            animate={{
              strokeDasharray: `${len * circumference} ${circumference}`,
              strokeWidth: active === seg.key ? stroke + 4 : stroke,
              opacity: active && active !== seg.key ? 0.35 : 1,
            }}
            transition={{
              strokeDasharray: { duration: 0.5, delay: index * 0.25, ease: 'easeOut' },
              strokeWidth: { duration: 0.15 },
              opacity: { duration: 0.15 },
            }}
            onMouseEnter={() => onActiveChange(seg.key)}
          />
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-foreground">
        <motion.div
          key={activeSeg?.key ?? 'overall'}
          className="flex flex-col items-center gap-0.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          {activeSeg ? (
            <>
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{activeSeg.label}</div>
              <div className={cn('text-xl font-semibold tabular-nums', activeSeg.textClass)}>
                {activeSeg.percent.toFixed(4)}%
              </div>
              <div className="text-xs text-muted-foreground">{formatMinutes(activeSeg.minutes)}</div>
            </>
          ) : (
            <>
              <div className="text-3xl font-semibold tabular-nums tracking-tight">{availability.toFixed(2)}%</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Availability</div>
            </>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

function availabilityStatus(pct: number) {
  return pct >= 99.9
    ? { label: 'Excellent', pill: 'bg-success/10 text-success' }
    : pct >= 99
      ? { label: 'Good', pill: 'bg-warning/10 text-warning' }
      : { label: 'Needs attention', pill: 'bg-destructive/10 text-destructive' };
}

function PanelMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-foreground">{value}</div>
    </div>
  );
}

function AvailabilityPanel({
  title,
  subtitle,
  icon: Icon,
  iconClassName,
  block,
  durationLabel,
  className,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconClassName: string;
  block: AvailabilityBlock;
  durationLabel: string;
  className?: string;
}) {
  const status = availabilityStatus(block.availabilityPercent);
  const [active, setActive] = useState<DonutKey | null>(null);
  const segments = buildSegments(block);
  return (
    <div className={cn('space-y-6 p-6', className)}>
      <div className="flex items-center gap-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', iconClassName)}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-tight text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="flex flex-col items-center gap-5 sm:flex-row">
        <AvailabilityDonut
          segments={segments}
          availability={block.availabilityPercent}
          active={active}
          onActiveChange={setActive}
        />
        <div className="flex min-w-0 flex-col items-center gap-3 sm:min-w-[240px] sm:items-start">
          <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', status.pill)}>
            {status.label}
          </span>
          <div className="w-full space-y-1">
            {segments.map((s) => (
              <button
                key={s.key}
                type="button"
                className={cn(
                  'grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-3 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring',
                  active === s.key && 'bg-muted/60',
                )}
                onMouseEnter={() => setActive(s.key)}
                onFocus={() => setActive(s.key)}
                onMouseLeave={() => setActive(null)}
                onBlur={() => setActive(null)}
              >
                <span className={cn('h-2.5 w-2.5 rounded-full', s.dotClass)} />
                <span className="min-w-0">
                  <span className="block text-sm text-foreground">{s.label}</span>
                  <span className="block text-xs text-muted-foreground">{s.countLabel}</span>
                </span>
                <span className="text-right">
                  <span className="block text-sm font-semibold tabular-nums text-foreground">{s.percent.toFixed(4)}%</span>
                  <span className="block text-xs text-muted-foreground">{formatMinutes(s.minutes)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-border [&>*:nth-child(-n+2)]:border-t-0 [&>*:nth-child(odd)]:border-l-0">
        <PanelMetric label={durationLabel} value={`${Math.floor(block.liveMinutes / 60).toLocaleString()} h`} />
        <PanelMetric label="Delay/Cancelled" value={formatMinutes(block.downtimeMinutes)} />
        <PanelMetric label="On Air Black / No Audio" value={formatMinutes(block.cancelledMinutes)} />
        <PanelMetric label="Incidents" value={block.incidentCount.toLocaleString()} />
      </div>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
        <div className="grid lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, p) => (
            <div key={p} className={cn('space-y-6 p-6', p === 1 && 'border-t border-border lg:border-l lg:border-t-0')}>
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="flex items-center gap-5">
                <Skeleton className="h-[140px] w-[140px] rounded-full" />
                <Skeleton className="h-6 w-28 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border bg-muted/30 px-6 py-4">
          <Skeleton className="h-4 w-2/3" />
        </div>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="rounded-2xl border-border/70 p-5 shadow-sm">
            <Skeleton className="mb-4 h-9 w-9 rounded-xl" />
            <Skeleton className="mb-2 h-3 w-24" />
            <Skeleton className="h-7 w-20" />
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="rounded-2xl border-border/70 p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-48 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ManagementReportPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: ReportTab = searchParams.get('tab') === 'operations' ? 'operations' : 'availability';
  const activeTab = REPORT_TABS.find((t) => t.key === tab) ?? REPORT_TABS[0];
  usePageHeader('Management Report', activeTab.subtitle);
  const { showToast } = useToast();

  function changeTab(next: ReportTab) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === 'availability') params.delete('tab');
        else params.set('tab', next);
        return params;
      },
      { replace: true },
    );
  }

  const [month, setMonth] = useState(() => format(new Date(), MONTH_FORMAT));
  const [downloading, setDownloading] = useState(false);

  const currentMonth = format(new Date(), MONTH_FORMAT);
  const monthDate = parseMonth(month);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['management-report', month],
    queryFn: () => managementReportApi.get(month),
  });

  const errorMessage = error ? getApiErrorMessage(error, 'Failed to load the report. Please try again.') : null;

  async function downloadPdf() {
    setDownloading(true);
    try {
      await managementReportApi.downloadPdf(month, tab);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Could not download the PDF'), 'error');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={(v) => changeTab(v as ReportTab)}>
        <TabsList className="h-auto flex-wrap justify-start">
          {REPORT_TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Reveal index={0} className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-xl border border-border bg-card p-1 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Previous month"
            onClick={() => setMonth(format(subMonths(monthDate, 1), MONTH_FORMAT))}
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="min-w-40 text-center text-sm font-semibold text-foreground">
            {format(monthDate, 'MMMM yyyy')}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Next month"
            disabled={month >= currentMonth}
            onClick={() => setMonth(format(addMonths(monthDate, 1), MONTH_FORMAT))}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
        {data?.isMonthToDate && (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Month to date
          </span>
        )}
        <Button className="ml-auto" onClick={() => void downloadPdf()} disabled={downloading}>
          {downloading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Download size={16} className="mr-2" />}
          Download PDF
        </Button>
      </Reveal>

      {isLoading && <ReportSkeleton />}

      {!isLoading && errorMessage && !data && (
        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <AlertCircle size={28} className="text-destructive" />
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {data && <ReportContent key={tab} data={data} tab={tab} />}
    </div>
  );
}

function ReportContent({ data, tab }: { data: ManagementReport; tab: ReportTab }) {
  const navigate = useNavigate();
  const { availability: av, guests, shoots } = data;

  const pct = av.availabilityPercent;
  const needsCheck = av.live.availabilityPercent < 99 || av.recorded.availabilityPercent < 99;
  const monthSuffix = data.isMonthToDate ? ' · month to date' : '';

  const kpis: { icon: LucideIcon; label: string; value: string; hint: string }[] = [
    {
      icon: Users,
      label: 'Guest appearances',
      value: guests.appearances.toLocaleString(),
      hint: `${guests.distinctGuests.toLocaleString()} distinct · ${guests.newGuests.toLocaleString()} new`,
    },
    {
      icon: Wallet,
      label: 'Guest spending',
      value: formatQar(guests.spending),
      hint: `${guests.appearances.toLocaleString()} completed bookings`,
    },
    {
      icon: Clapperboard,
      label: 'Shoots',
      value: shoots.total.toLocaleString(),
      hint: `${shoots.indoor.toLocaleString()} indoor · ${shoots.outdoor.toLocaleString()} outdoor`,
    },
    {
      icon: Radio,
      label: 'Live shoots',
      value: shoots.live.toLocaleString(),
      hint: `${shoots.recorded.toLocaleString()} recorded`,
    },
  ];


  if (tab === 'operations') {
    return (
      <div className="space-y-6">
        {/* Headline KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k, i) => (
            <Reveal key={k.label} index={1 + i}>
              <div className="h-full rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
                <div className="mb-4">
                  <IconChip icon={k.icon} />
                </div>
                <Metric label={k.label} value={k.value} hint={k.hint} />
              </div>
            </Reveal>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* DTL guests */}
          <Reveal index={7}>
            <SectionCard icon={Users} title="DTL guests" description="Completed guest bookings and spending">
              {guests.appearances === 0 ? (
                <EmptyState icon={Users} title="No guest bookings" hint="No completed DTL bookings in this period" />
              ) : (
                <>
                  <StatStrip cols={3}>
                    <Metric label="Appearances" value={guests.appearances.toLocaleString()} />
                    <Metric label="Distinct guests" value={guests.distinctGuests.toLocaleString()} />
                    <Metric label="Cancelled" value={guests.cancelled.toLocaleString()} />
                  </StatStrip>
                  {guests.topProgrammes.length > 0 && (
                    <div>
                      <SubHead>Top programmes</SubHead>
                      <RankedList
                        rows={guests.topProgrammes.map((p) => ({
                          name: p.name,
                          primary: formatQar(p.spending),
                          secondary: `${p.appearances} appearances`,
                          weight: p.appearances,
                        }))}
                      />
                    </div>
                  )}
                  {guests.topGuests.length > 0 && (
                    <div>
                      <SubHead>Top guests</SubHead>
                      <RankedList
                        rows={guests.topGuests.map((g) => ({
                          name: g.name,
                          primary: formatQar(g.amount),
                          secondary: `${g.appearances} appearances`,
                          weight: g.appearances,
                        }))}
                      />
                    </div>
                  )}
                </>
              )}
            </SectionCard>
          </Reveal>

          {/* Shoots */}
          <Reveal index={8}>
            <SectionCard icon={Clapperboard} title="Shoots" description="Call sheets scheduled this month">
              {shoots.total === 0 ? (
                <EmptyState
                  icon={Clapperboard}
                  title="No shoots"
                  hint="No call sheets with a filming date in this period"
                />
              ) : (
                <>
                  <StatStrip cols={3}>
                    <Metric label="Total" value={shoots.total.toLocaleString()} />
                    <Metric label="Completed" value={shoots.completed.toLocaleString()} />
                    <Metric label="Cancelled" value={shoots.cancelled.toLocaleString()} />
                  </StatStrip>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <SubHead>Location</SubHead>
                      <SplitBar
                        segments={[
                          { label: 'Indoor', value: shoots.indoor, className: 'bg-primary' },
                          { label: 'Outdoor', value: shoots.outdoor, className: 'bg-info' },
                        ]}
                      />
                    </div>
                    <div className="space-y-2">
                      <SubHead>Type</SubHead>
                      <SplitBar
                        segments={[
                          { label: 'Live', value: shoots.live, className: 'bg-destructive' },
                          { label: 'Recorded', value: shoots.recorded, className: 'bg-success' },
                          ...(shoots.otherType > 0
                            ? [{ label: 'Other', value: shoots.otherType, className: 'bg-muted-foreground/40' }]
                            : []),
                        ]}
                      />
                    </div>
                  </div>
                  {shoots.byDepartment.length > 0 && (
                    <div>
                      <SubHead>By department</SubHead>
                      <RankedList
                        rows={shoots.byDepartment.map((d) => {
                          const total = d.indoor + d.outdoor;
                          return {
                            name: d.name,
                            primary: total.toLocaleString(),
                            secondary: `Indoor ${d.indoor} · Outdoor ${d.outdoor} · Live ${d.live}`,
                            weight: total,
                          };
                        })}
                      />
                    </div>
                  )}
                </>
              )}
            </SectionCard>
          </Reveal>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Availability hero */}
      <Reveal index={1}>
        <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
          <div className="grid lg:grid-cols-2">
            <AvailabilityPanel
              title="Live programmes"
              subtitle={`16 h daily${monthSuffix}`}
              icon={Radio}
              iconClassName="bg-destructive/10 text-destructive"
              block={av.live}
              durationLabel="Live duration"
            />
            <AvailabilityPanel
              className="border-t border-border lg:border-l lg:border-t-0"
              title="Recorded & playout"
              subtitle={`8 h daily${monthSuffix}`}
              icon={Film}
              iconClassName="bg-info/10 text-info"
              block={av.recorded}
              durationLabel="Recorded duration"
            />
          </div>
          <div className="space-y-1 border-t border-border bg-muted/30 px-6 py-4 text-sm">
            <p className="text-foreground">
              Result: <strong className="font-semibold">{av.live.availabilityPercent.toFixed(4)}%</strong>
              {` live availability over ${av.days} days, with ${
                av.live.downtimeMinutes > 0 ? formatMinutes(av.live.downtimeMinutes) : 'no'
              } live delay/cancelled and ${formatMinutes(av.live.cancelledMinutes)} on air black / no audio.`}
            </p>
            <p className="text-muted-foreground">
              {`Overall 24 h availability ${pct.toFixed(4)}% · ${av.incidentCount.toLocaleString()} on-air incidents`}
            </p>
            {needsCheck && (
              <p className="text-muted-foreground">
                Downtime is measured from incident start to service restored on on-air tickets. Check that incidents
                below have the correct restore time.
              </p>
            )}
          </div>
        </Card>
      </Reveal>

      {/* On-air incidents */}
      <Reveal index={6}>
        <SectionCard icon={Radio} title="On-air incidents" description="Tickets flagged with on-air impact this month">
          {av.incidents.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              iconClassName="text-success"
              title="No on-air incidents"
              hint="Uninterrupted broadcast this month"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    {['Ticket', 'Type', 'Title', 'Programme', 'Started', 'Restored', 'Duration', 'Report'].map((h) => (
                      <TableHead
                        key={h}
                        className={cn(
                          'h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground',
                          h === 'Duration' && 'text-right',
                        )}
                      >
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {av.incidents.map((i) => (
                    <TableRow key={i.ticketId}>
                      <TableCell className="py-3">
                        <button
                          type="button"
                          onClick={() => navigate(ticketPath(i.ticketId))}
                          className="font-medium text-primary hover:underline"
                        >
                          {i.ticketNo}
                        </button>
                      </TableCell>
                      <TableCell className="py-3">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            i.type === 'live' && 'bg-destructive/10 text-destructive',
                            i.type === 'recorded' && 'bg-info/10 text-info',
                            i.type === 'mixed' && 'bg-warning/10 text-warning',
                          )}
                        >
                          {i.type === 'live' ? 'Live' : i.type === 'recorded' ? 'Recorded' : 'Mixed'}
                        </span>
                        {i.epgMissing && (
                          <div
                            className="mt-0.5 text-xs text-muted-foreground"
                            title="No EPG schedule for part of this incident — counted as live"
                          >
                            EPG missing
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate py-3 text-sm">{i.title}</TableCell>
                      <TableCell className="py-3 text-sm">{i.programme ?? '—'}</TableCell>
                      <TableCell className="py-3 text-sm tabular-nums">
                        {format(new Date(i.startedAt), 'dd MMM HH:mm')}
                      </TableCell>
                      <TableCell className="py-3 text-sm tabular-nums">
                        {i.ongoing || !i.restoredAt ? (
                          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                            Ongoing
                          </span>
                        ) : (
                          format(new Date(i.restoredAt), 'dd MMM HH:mm')
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-right text-sm font-medium tabular-nums">
                        {formatMinutes(i.minutes)}
                        {i.type === 'mixed' && (
                          <div className="text-xs font-normal text-muted-foreground">
                            {`Live ${formatMinutes(i.liveMinutes)} · Rec ${formatMinutes(i.recordedMinutes)}`}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-sm">{i.reportNo ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      </Reveal>

    </div>
  );
}
