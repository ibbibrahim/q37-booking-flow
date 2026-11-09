import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { formatDistanceToNowStrict } from 'date-fns';
import { AlertCircle, CheckCircle2, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ListPaginationBar } from '@/components/ui/list-pagination-bar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { bitTicketApi } from '@/api/bitTicketApi';
import { bitVendorApi } from '@/api/bitVendorApi';
import { getApiErrorMessage } from '@/api/bitChecklistApi';
import { useAuth } from '@/contexts/AuthContext';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/lib/utils';
import { OnAirBadge } from '../components/OnAirBadge';
import { ReportStateChip } from '../components/ReportStateChip';
import { TicketFormDialog } from '../components/TicketFormDialog';
import { TicketPriorityBadge } from '../components/TicketPriorityBadge';
import { TicketSlaChip } from '../components/TicketSlaChip';
import { TicketStatusBadge } from '../components/TicketStatusBadge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useBitTicketChanged } from '../hooks/useBitTicketChanged';
import { useNow } from '../hooks/useNow';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  DONE_STATUSES,
  OPEN_STATUSES,
  PRIORITIES,
  PRIORITY_LABELS,
  firstNameOf,
} from '../utils/ticketUtils';
import type {
  BitTicketListItem,
  BitTicketListParams,
  BitTicketSummary,
  TicketCategory,
  TicketPriority,
} from '../types/ticket';
import { ticketPath } from '../utils/engineeringPaths';

type ViewKey =
  | 'open'
  | 'incidents'
  | 'reports_due'
  | 'mine'
  | 'created'
  | 'following'
  | 'unassigned'
  | 'breached'
  | 'done'
  | 'hold';

const VIEW_PARAMS: Record<ViewKey, Partial<BitTicketListParams>> = {
  open: { status: OPEN_STATUSES },
  incidents: { onAir: true },
  reports_due: { onAir: true, reportState: ['due', 'overdue'] },
  mine: { assignee: 'me', status: OPEN_STATUSES },
  created: { createdBy: 'me' },
  following: { following: true },
  unassigned: { assignee: 'unassigned', status: OPEN_STATUSES },
  breached: { sla: 'breached', status: OPEN_STATUSES },
  done: { status: DONE_STATUSES },
  hold: { status: ['on_hold'] },
};

const TABS: { key: ViewKey; label: string }[] = [
  { key: 'open', label: 'All open' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'mine', label: 'Assigned to me' },
  { key: 'created', label: 'Created by me' },
  { key: 'following', label: 'Following' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'breached', label: 'Breached' },
  { key: 'done', label: 'Resolved / Closed' },
];

const KPIS: {
  key: ViewKey;
  label: string;
  value: (s: BitTicketSummary) => number;
  danger?: (s: BitTicketSummary) => boolean;
}[] = [
  { key: 'open', label: 'Open', value: (s) => s.open },
  { key: 'mine', label: 'Assigned to me', value: (s) => s.assignedToMe },
  { key: 'unassigned', label: 'Unassigned', value: (s) => s.unassigned },
  { key: 'breached', label: 'SLA breached', value: (s) => s.breached, danger: (s) => s.breached > 0 },
  { key: 'hold', label: 'On hold', value: (s) => s.onHold },
  {
    key: 'reports_due',
    label: 'Reports due',
    value: (s) => (s.reportsDue ?? 0) + (s.reportsOverdue ?? 0),
    danger: (s) => (s.reportsOverdue ?? 0) > 0,
  },
];

const ALL = '__all__';
const headClass = 'h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';
const GRID_CLASS =
  'min-w-[1180px] [&_th]:border-r [&_td]:border-r [&_th]:border-border/70 [&_td]:border-border/70 [&_th:last-child]:border-r-0 [&_td:last-child]:border-r-0';

function isBreachedOpen(t: BitTicketListItem): boolean {
  if (t.status === 'resolved' || t.status === 'closed') return false;
  return t.resolveSla.state === 'breached' || (!t.firstResponseAt && t.responseSla.state === 'breached');
}

function TicketTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <Table className={GRID_CLASS}>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {['Ticket', 'Title', 'Priority', 'Status', 'Raised by', 'Assignee', 'Vendor', 'SLA', 'Updated'].map((h) => (
                <TableHead key={h} className={headClass}>
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 7 }).map((_, i) => (
              <TableRow key={i} className="hover:bg-transparent">
                {[16, 56, 18, 20, 20, 24, 20, 22, 18].map((w, c) => (
                  <TableCell key={c} className="py-3.5">
                    <Skeleton className="h-4" style={{ width: `${w * 4}px`, maxWidth: '100%' }} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function BITTicketsPage() {
  usePageHeader('Tickets', 'Track, assign and resolve engineering issues');

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const now = useNow();

  const [view, setView] = useState<ViewKey>('open');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<string>(ALL);
  const [category, setCategory] = useState<string>(ALL);
  const [assignee, setAssignee] = useState<string>(ALL);
  const [vendor, setVendor] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  // "n" opens the new-ticket dialog unless the user is typing somewhere.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'n' || e.ctrlKey || e.metaKey || e.altKey || formOpen) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      e.preventDefault();
      setFormOpen(true);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [formOpen]);

  const params = useMemo<BitTicketListParams>(() => {
    const p: BitTicketListParams = { ...VIEW_PARAMS[view], sort: 'updated', page, pageSize };
    if (priority !== ALL) p.priority = [priority as TicketPriority];
    if (category !== ALL) p.category = category as TicketCategory;
    if (assignee !== ALL) p.assignee = assignee;
    if (vendor !== ALL) p.vendorId = Number(vendor);
    if (search) p.search = search;
    return p;
  }, [view, priority, category, assignee, vendor, search, page, pageSize]);

  const { data: summary } = useQuery({ queryKey: ['bit-ticket-summary'], queryFn: bitTicketApi.summary });
  const { data: vendors = [] } = useQuery({ queryKey: ['bit-vendors'], queryFn: bitVendorApi.list });
  const { data: assignees = [] } = useQuery({ queryKey: ['bit-ticket-assignees'], queryFn: bitTicketApi.assignees });

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['bit-tickets', params],
    queryFn: () => bitTicketApi.list(params),
    placeholderData: keepPreviousData,
  });

  useBitTicketChanged((t) => {
    void queryClient.invalidateQueries({ queryKey: ['bit-tickets'] });
    void queryClient.invalidateQueries({ queryKey: ['bit-ticket-summary'] });
    void queryClient.invalidateQueries({ queryKey: ['bit-ticket', t.id] });
    void queryClient.invalidateQueries({ queryKey: ['bit-incident-register'] });
  });

  const pickUp = useMutation({
    mutationFn: (id: number) => bitTicketApi.assign(id, user?.id ?? null),
    onSuccess: (t) => {
      void queryClient.invalidateQueries({ queryKey: ['bit-tickets'] });
      void queryClient.invalidateQueries({ queryKey: ['bit-ticket-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['bit-ticket', t.id] });
      showToast(`You picked up ${t.ticketNo}`, 'success');
    },
    onError: (err) => showToast(getApiErrorMessage(err, 'Could not pick up ticket'), 'error'),
  });

  function changeView(next: ViewKey) {
    setView(next);
    setPage(1);
  }

  function filterChange(setter: (v: string) => void) {
    return (v: string) => {
      setter(v);
      setPage(1);
    };
  }

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const errorMessage = error ? getApiErrorMessage(error, 'Failed to load tickets. Please try again.') : null;
  const filtering = !!search || priority !== ALL || category !== ALL || assignee !== ALL || vendor !== ALL;

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {KPIS.map((k, i) => {
          const count = summary ? k.value(summary) : undefined;
          const selected = view === k.key;
          const danger = !!summary && !!k.danger?.(summary);
          return (
            <motion.button
              key={k.key}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
              onClick={() => changeView(k.key)}
              aria-pressed={selected}
              className={cn(
                'rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                danger && 'border-destructive/30 bg-destructive/5 hover:bg-destructive/10',
                selected ? 'border-primary ring-2 ring-primary' : !danger && 'border-border'
              )}
            >
              <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
              {count === undefined ? (
                <Skeleton className="mt-2 h-7 w-10" />
              ) : (
                <p className={cn('mt-1 text-2xl font-semibold tabular-nums', danger ? 'text-destructive' : 'text-card-foreground')}>
                  {count}
                </p>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* View tabs */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.1 }}>
        <Tabs value={view === 'reports_due' ? 'incidents' : view} onValueChange={(v) => changeView(v as ViewKey)}>
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
      </motion.div>

      {view === 'reports_due' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Showing incidents with a report due or overdue
          <button
            type="button"
            onClick={() => changeView('incidents')}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs font-medium hover:bg-muted hover:text-foreground"
          >
            <X size={11} aria-hidden />
            Show all incidents
          </button>
        </div>
      )}

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.14 }}
        className="flex flex-wrap items-center gap-3"
      >
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search tickets, #, systems…"
            aria-label="Search tickets"
            className="pl-9"
          />
        </div>

        <Select value={priority} onValueChange={filterChange(setPriority)}>
          <SelectTrigger className="w-[140px]" aria-label="Filter by priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All priorities</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={filterChange(setCategory)}>
          <SelectTrigger className="w-[170px]" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={assignee} onValueChange={filterChange(setAssignee)}>
          <SelectTrigger className="w-[160px]" aria-label="Filter by assignee">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any assignee</SelectItem>
            <SelectItem value="me">Me</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {assignees.length > 0 && <SelectSeparator />}
            {assignees
              .filter((a) => a.userId !== user?.id)
              .map((a) => (
                <SelectItem key={a.userId} value={String(a.userId)}>
                  {a.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Select value={vendor} onValueChange={filterChange(setVendor)}>
          <SelectTrigger className="w-[150px]" aria-label="Filter by vendor">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All vendors</SelectItem>
            {vendors.map((v) => (
              <SelectItem key={v.id} value={String(v.id)}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button className="ml-auto" onClick={() => setFormOpen(true)}>
          <Plus />
          New ticket
          <kbd className="ml-1 hidden rounded border border-primary-foreground/30 px-1 text-[10px] font-medium leading-4 sm:inline">
            N
          </kbd>
        </Button>
      </motion.div>

      {isLoading && <TicketTableSkeleton />}

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
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="font-semibold text-card-foreground">
                {filtering ? 'No tickets match your filters' : 'No tickets here — nice work'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {filtering ? 'Try clearing a filter or searching for something else.' : 'Nothing needs attention in this view.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !errorMessage && items.length > 0 && (
        <div className="space-y-3">
          <ListPaginationBar
            currentPage={page}
            totalItems={totalCount}
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
                    <TableHead className={cn(headClass, 'w-[100px]')}>Ticket</TableHead>
                    <TableHead className={headClass}>Title</TableHead>
                    <TableHead className={cn(headClass, 'w-[110px]')}>Priority</TableHead>
                    <TableHead className={cn(headClass, 'w-[120px]')}>Status</TableHead>
                    <TableHead className={cn(headClass, 'w-[130px]')}>Raised by</TableHead>
                    <TableHead className={cn(headClass, 'w-[170px]')}>Assignee</TableHead>
                    <TableHead className={cn(headClass, 'w-[120px]')}>Vendor</TableHead>
                    <TableHead className={cn(headClass, 'w-[170px]')}>SLA</TableHead>
                    <TableHead className={cn(headClass, 'w-[120px]')}>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((t) => {
                    const breached = isBreachedOpen(t);
                    const finished = t.status === 'resolved' || t.status === 'closed';
                    const showResponse = !finished && !t.firstResponseAt;
                    return (
                      <TableRow
                        key={t.id}
                        onClick={() => navigate(ticketPath(t.id))}
                        className={cn(
                          'group cursor-pointer transition-colors hover:bg-muted/30',
                          breached && 'bg-destructive/[0.03]'
                        )}
                      >
                        <TableCell
                          className={cn(
                            'py-3 font-mono text-xs tabular-nums text-muted-foreground',
                            breached && 'border-l-2 border-l-destructive'
                          )}
                        >
                          {t.ticketNo}
                        </TableCell>
                        <TableCell className="max-w-[360px] py-3">
                          <div className="flex min-w-0 items-center gap-2">
                            {t.onAirImpact && <OnAirBadge />}
                            <p className="truncate font-medium text-card-foreground" title={t.title}>
                              {t.title}
                            </p>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {CATEGORY_LABELS[t.category]}
                            {t.affectedSystem ? ` · ${t.affectedSystem}` : ''}
                          </p>
                        </TableCell>
                        <TableCell className="py-3">
                          <TicketPriorityBadge priority={t.priority} />
                        </TableCell>
                        <TableCell className="py-3">
                          <TicketStatusBadge status={t.status} />
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <UserAvatar name={t.createdByName} />
                            <span className="truncate text-sm">{firstNameOf(t.createdByName)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          {t.assigneeUserId ? (
                            <div className="flex items-center gap-2">
                              <UserAvatar name={t.assigneeName} />
                              <span className="truncate text-sm">{t.assigneeName}</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm italic text-muted-foreground">Unassigned</span>
                              {!finished && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs transition-opacity focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                  disabled={pickUp.isPending}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    pickUp.mutate(t.id);
                                  }}
                                >
                                  Pick up
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-sm">
                          {t.vendorName ? (
                            <span className="truncate">{t.vendorName}</span>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3" title={showResponse ? 'Response SLA' : 'Resolution SLA'}>
                          <div className="flex flex-col items-start gap-1">
                            <TicketSlaChip sla={showResponse ? t.responseSla : t.resolveSla} now={now} />
                            {t.onAirImpact && (t.reportState === 'due' || t.reportState === 'overdue') && (
                              <ReportStateChip state={t.reportState} dueAt={t.reportDueAt} now={now} />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-xs tabular-nums text-muted-foreground">
                          {formatDistanceToNowStrict(new Date(t.updatedAt), { addSuffix: true })}
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

      <TicketFormDialog open={formOpen} onOpenChange={setFormOpen} ticket={null} />
    </div>
  );
}
