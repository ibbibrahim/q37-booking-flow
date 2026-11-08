import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { format, startOfMonth } from 'date-fns';
import { AlertCircle, Download, FileText, PenLine, Search, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ListPaginationBar } from '@/components/ui/list-pagination-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { bitTicketApi } from '@/api/bitTicketApi';
import { bitIncidentApi } from '@/api/bitIncidentApi';
import { getApiErrorMessage } from '@/api/bitChecklistApi';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/lib/utils';
import { OnAirBadge } from '../components/OnAirBadge';
import { ReportStateChip } from '../components/ReportStateChip';
import { TicketPriorityBadge } from '../components/TicketPriorityBadge';
import { useBitTicketChanged } from '../hooks/useBitTicketChanged';
import { useNow } from '../hooks/useNow';
import { formatDowntime } from '../utils/ticketUtils';
import type { IncidentRegisterItem } from '../types/incident';

type StateKey = 'all' | 'in_progress' | 'due' | 'overdue' | 'submitted';

const TABS: { key: StateKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'in_progress', label: 'Ongoing' },
  { key: 'due', label: 'Report due' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'submitted', label: 'Submitted' },
];

const headClass = 'h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';
const GRID_CLASS =
  'min-w-[1100px] [&_th]:border-r [&_td]:border-r [&_th]:border-border/70 [&_td]:border-border/70 [&_th:last-child]:border-r-0 [&_td:last-child]:border-r-0';

function fmt(iso: string | null, pattern = 'd MMM, HH:mm'): string {
  return iso ? format(new Date(iso), pattern) : '—';
}

function Kpi({ label, value, danger, index }: { label: string; value: number | undefined; danger?: boolean; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className={cn(
        'rounded-xl border bg-card p-4 shadow-sm',
        danger ? 'border-destructive/30 bg-destructive/5' : 'border-border'
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {value === undefined ? (
        <Skeleton className="mt-2 h-7 w-10" />
      ) : (
        <p className={cn('mt-1 text-2xl font-semibold tabular-nums', danger ? 'text-destructive' : 'text-card-foreground')}>
          {value}
        </p>
      )}
    </motion.div>
  );
}

function RegisterSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="space-y-3 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}

export function BITIncidentRegisterPage() {
  usePageHeader('Incidents', 'On-air incidents and their technical reports');

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const now = useNow();

  const [state, setState] = useState<StateKey>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const params = {
    state: state === 'all' ? undefined : state,
    search: search || undefined,
    page,
    pageSize,
  };

  const { data: summary } = useQuery({ queryKey: ['bit-ticket-summary'], queryFn: bitTicketApi.summary });

  const monthParams = {
    state: 'submitted',
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
    page: 1,
    pageSize: 1,
  };
  const { data: monthData } = useQuery({
    queryKey: ['bit-incident-register', monthParams],
    queryFn: () => bitIncidentApi.listRegister(monthParams),
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['bit-incident-register', params],
    queryFn: () => bitIncidentApi.listRegister(params),
    placeholderData: keepPreviousData,
  });

  useBitTicketChanged(() => {
    void queryClient.invalidateQueries({ queryKey: ['bit-incident-register'] });
    void queryClient.invalidateQueries({ queryKey: ['bit-ticket-summary'] });
  });

  async function download(item: IncidentRegisterItem) {
    setDownloadingId(item.ticketId);
    try {
      await bitIncidentApi.downloadPdf(item.ticketId, item.reportNo ?? item.ticketNo);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Could not download the PDF'), 'error');
    } finally {
      setDownloadingId(null);
    }
  }

  const items = data?.items ?? [];
  const errorMessage = error ? getApiErrorMessage(error, 'Failed to load incidents. Please try again.') : null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi index={0} label="Open incidents" value={summary?.incidentsOpen} />
        <Kpi index={1} label="Reports due" value={summary?.reportsDue} />
        <Kpi index={2} label="Reports overdue" value={summary?.reportsOverdue} danger={(summary?.reportsOverdue ?? 0) > 0} />
        <Kpi index={3} label="Submitted this month" value={monthData?.totalCount} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1 }}
        className="flex flex-wrap items-center gap-3"
      >
        <Tabs
          value={state}
          onValueChange={(v) => {
            setState(v as StateKey);
            setPage(1);
          }}
        >
          <div className="overflow-x-auto">
            <TabsList className="h-auto flex-wrap justify-start">
              {TABS.map((t) => (
                <TabsTrigger key={t.key} value={t.key}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
        <div className="relative w-full sm:ml-auto sm:max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search incidents, report #…"
            aria-label="Search incidents"
            className="pl-9"
          />
        </div>
      </motion.div>

      {isLoading && <RegisterSkeleton />}

      {!isLoading && errorMessage && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <AlertCircle size={28} className="text-destructive" />
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !errorMessage && items.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="font-semibold text-card-foreground">No on-air incidents recorded</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {state !== 'all' || search ? 'Try another filter or search term.' : 'Incidents raised from tickets will appear here.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !errorMessage && items.length > 0 && (
        <div className="space-y-3">
          <ListPaginationBar
            currentPage={page}
            totalItems={data?.totalCount ?? 0}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50]}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
          />
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          >
            <div className="overflow-x-auto">
              <Table className={GRID_CLASS}>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className={cn(headClass, 'w-[120px]')}>Report no</TableHead>
                    <TableHead className={headClass}>Ticket</TableHead>
                    <TableHead className={cn(headClass, 'w-[120px]')}>Started</TableHead>
                    <TableHead className={cn(headClass, 'w-[100px]')}>Downtime</TableHead>
                    <TableHead className={cn(headClass, 'w-[110px]')}>Priority</TableHead>
                    <TableHead className={cn(headClass, 'w-[190px]')}>Report</TableHead>
                    <TableHead className={cn(headClass, 'w-[140px]')}>Prepared by</TableHead>
                    <TableHead className={cn(headClass, 'w-[120px]')}>Submitted</TableHead>
                    <TableHead className={cn(headClass, 'w-[130px]')}>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((r) => {
                    const submitted = r.reportState === 'submitted';
                    return (
                      <TableRow
                        key={r.ticketId}
                        onClick={() => navigate(`/bit/tickets/${r.ticketId}`)}
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-muted/30',
                          r.reportState === 'overdue' && 'bg-destructive/[0.03]'
                        )}
                      >
                        <TableCell className="py-3 font-mono text-xs tabular-nums text-muted-foreground">
                          {r.reportNo ?? '—'}
                        </TableCell>
                        <TableCell className="max-w-[360px] py-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <OnAirBadge />
                            <p className="truncate font-medium text-card-foreground" title={r.title}>
                              {r.title}
                            </p>
                          </div>
                          <p className="font-mono text-xs tabular-nums text-muted-foreground">{r.ticketNo}</p>
                        </TableCell>
                        <TableCell className="py-3 text-sm tabular-nums">{fmt(r.incidentStartedAt)}</TableCell>
                        <TableCell className="py-3 text-sm tabular-nums">{formatDowntime(r.downtimeMinutes)}</TableCell>
                        <TableCell className="py-3">
                          <TicketPriorityBadge priority={r.priority} />
                        </TableCell>
                        <TableCell className="py-3">
                          <ReportStateChip state={r.reportState} dueAt={r.reportDueAt} now={now} />
                        </TableCell>
                        <TableCell className="py-3 text-sm">
                          {r.preparedByName ?? <span className="text-muted-foreground/50">—</span>}
                        </TableCell>
                        <TableCell className="py-3 text-sm tabular-nums">{fmt(r.submittedAt)}</TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/bit/tickets/${r.ticketId}/report`);
                              }}
                            >
                              {submitted ? <FileText /> : <PenLine />}
                              {submitted ? 'View' : 'Write'}
                            </Button>
                            {submitted && (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground"
                                aria-label={`Download PDF for ${r.reportNo ?? r.ticketNo}`}
                                disabled={downloadingId === r.ticketId}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void download(r);
                                }}
                              >
                                <Download />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
