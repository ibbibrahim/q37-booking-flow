import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  Grid3x3,
  List,
  Edit,
  X,
  Calendar,
  Tag,
  Layers,
  User,
  ListChecks,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { endOfDay, formatDistanceToNowStrict, startOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';

import { RequestCard } from './RequestCard';
import {
  getBookingTypeLabel,
  type WorkflowRequest,
  type WorkflowStatus,
  type UserRole,
  type BookingType,
  type Priority,
} from '../types/workflow';
import { mockApi } from '../services/bookingApi';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/user-avatar';
import { StatusPill } from '@/components/ui/status-pill';
import type { Tone } from '@/lib/tone';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { DateRangePicker } from '@/components/DateRangePicker';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ListFilterBar, FilterActiveFiltersRow } from '@/components/ui/list-filter-bar';
import { ListPaginationBar, getInitialPage, getInitialPageSize } from '@/components/ui/list-pagination-bar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const PAGINATION_STORAGE_KEY = 'booking-workflow:list';
const FILTERS_STORAGE_KEY = 'booking-workflow:list:filters:v2';

interface RequestListProps {
  userRole: UserRole;
  onCreateNew: () => void;
  /** Increment to refetch the current search (e.g. SignalR). */
  refreshSignal?: number;
}

type ViewMode = 'grid' | 'list';

type StatusFilter = WorkflowStatus | 'All';
type BookingTypeFilter = BookingType | 'All';

interface PersistedFilters {
  searchQuery: string;
  statusFilter: StatusFilter;
  bookingTypeFilter: BookingTypeFilter;
  createdFrom?: string;
  createdTo?: string;
  onlyMine: boolean;
}

function parseIsoDateRange(fromIso?: string, toIso?: string): DateRange | undefined {
  if (!fromIso && !toIso) return undefined;
  return {
    from: fromIso ? new Date(fromIso) : undefined,
    to: toIso ? new Date(toIso) : undefined,
  };
}

function loadPersistedFilters(): PersistedFilters {
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) {
      return {
        searchQuery: '',
        statusFilter: 'All',
        bookingTypeFilter: 'All',
        // Booking requesters see only their own requests by default until they opt out.
        onlyMine: true,
      };
    }
    const parsed = JSON.parse(raw) as PersistedFilters;
    return {
      searchQuery: typeof parsed.searchQuery === 'string' ? parsed.searchQuery : '',
      statusFilter: (parsed.statusFilter as StatusFilter) ?? 'All',
      bookingTypeFilter: (parsed.bookingTypeFilter as BookingTypeFilter) ?? 'All',
      createdFrom: parsed.createdFrom,
      createdTo: parsed.createdTo,
      onlyMine: typeof parsed.onlyMine === 'boolean' ? parsed.onlyMine : true,
    };
  } catch {
    return {
      searchQuery: '',
      statusFilter: 'All',
      bookingTypeFilter: 'All',
      onlyMine: true,
    };
  }
}

function persistFilters(f: PersistedFilters) {
  try {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(f));
  } catch {
    /* ignore */
  }
}

function rangeToApi(range: DateRange | undefined): { from?: string; to?: string } {
  if (!range?.from && !range?.to) return {};
  return {
    from: range.from ? startOfDay(range.from).toISOString() : undefined,
    to: range.to ? endOfDay(range.to).toISOString() : undefined,
  };
}

const headClass = 'h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';
const GRID_CLASS =
  'min-w-[1280px] [&_th]:border-r [&_td]:border-r [&_th]:border-border/70 [&_td]:border-border/70 [&_th:last-child]:border-r-0 [&_td:last-child]:border-r-0';

const STATUS_TONES: Record<WorkflowStatus, Tone> = {
  Draft: 'muted',
  Submitted: 'info',
  'With NOC': 'warning',
  'Clarification Requested': 'warning',
  'Resources Added': 'primary',
  'With Ingest': 'primary',
  Completed: 'success',
  'Not Done': 'destructive',
  'Partially Completed': 'success',
};

const PRIORITY_TONES: Record<Priority, Tone> = {
  Normal: 'muted',
  High: 'warning',
  Urgent: 'destructive',
};

/** Per-type hues kept from the original list (pill + dot), so each booking type stays distinguishable. */
const BOOKING_TYPE_PILL: Record<BookingType, { pill: string; dot: string }> = {
  'Incoming Feed': {
    pill: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    dot: 'bg-blue-500',
  },
  'Invite Guest for News': {
    pill: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800',
    dot: 'bg-teal-500',
  },
  'Invite Guest for Program': {
    pill: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800',
    dot: 'bg-cyan-500',
  },
  'Download and Ingest': {
    pill: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
  'Camera Card and Ingest': {
    pill: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
};

function BookingTypePill({ type }: { type: BookingType }) {
  const style = BOOKING_TYPE_PILL[type] ?? { pill: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground/60' };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        style.pill,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} aria-hidden />
      {getBookingTypeLabel(type)}
    </span>
  );
}

const LIST_STATUSES: (WorkflowStatus | 'All')[] = [
  'All',
  'With NOC',
  'Clarification Requested',
  'With Ingest',
  'Completed',
  'Not Done',
];

const BOOKING_TYPES: BookingType[] = [
  'Incoming Feed',
  'Download and Ingest',
  'Camera Card and Ingest',
];

/** Statuses each role sees when no explicit status filter is chosen ("All states"). Mirrors visibleForRole in bookingApi.ts. */
const ROLE_VISIBLE_STATUSES: Partial<Record<UserRole, WorkflowStatus[]>> = {
  NOC: [
    'Submitted',
    'With NOC',
    'Clarification Requested',
    'Resources Added',
    'With Ingest',
    'Completed',
    'Partially Completed',
    'Not Done',
  ],
  Ingest: ['With Ingest', 'Completed', 'Not Done', 'Partially Completed'],
};

/** How many pending rows the popup fetches/shows before pointing people at the full filtered list instead. */
const PENDING_POPUP_LIMIT = 50;

/** Roles that get the "Pending" quick-access popup: which statuses count as pending, and the copy to show. */
const PENDING_CONFIG: Partial<Record<UserRole, { statuses: WorkflowStatus[]; description: string }>> = {
  NOC: {
    statuses: ['With NOC'],
    description: 'Incoming Feed requests waiting for NOC to acknowledge and assign resources.',
  },
  Ingest: {
    statuses: ['With Ingest'],
    description: 'Requests currently sitting With Ingest, waiting to be processed.',
  },
};

export const RequestList: React.FC<RequestListProps> = ({
  userRole,
  onCreateNew,
  refreshSignal = 0,
}) => {
  const { user } = useAuth();
  const persisted = useMemo(() => loadPersistedFilters(), []);
  const [searchTerm, setSearchTerm] = useState(persisted.searchQuery);
  const [debouncedSearch, setDebouncedSearch] = useState(persisted.searchQuery);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(persisted.statusFilter);
  const [bookingTypeFilter, setBookingTypeFilter] = useState<BookingTypeFilter>(persisted.bookingTypeFilter);
  const [createdDateRange, setCreatedDateRange] = useState<DateRange | undefined>(() =>
    parseIsoDateRange(persisted.createdFrom, persisted.createdTo)
  );
  // Booking requesters only: lets them see just the requests they personally created.
  const [onlyMine, setOnlyMine] = useState<boolean>(persisted.onlyMine);

  const [items, setItems] = useState<WorkflowRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Pending-tasks popup — lets roles like NOC/Ingest see what's waiting on them without digging
  // through thousands of already-completed rows.
  const pendingConfig = PENDING_CONFIG[userRole];
  const [pendingOpen, setPendingOpen] = useState(false);
  const [pendingItems, setPendingItems] = useState<WorkflowRequest[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingSearch, setPendingSearch] = useState('');
  const filteredPendingItems = useMemo(() => {
    const q = pendingSearch.trim().toLowerCase();
    if (!q) return pendingItems;
    return pendingItems.filter((r) =>
      [r.title, r.program, r.createdByUser?.displayName ?? r.createdBy]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [pendingItems, pendingSearch]);

  const [currentPage, setCurrentPage] = useState(() => getInitialPage(PAGINATION_STORAGE_KEY, 1));
  const [pageSize, setPageSize] = useState(() => getInitialPageSize(PAGINATION_STORAGE_KEY, 10));

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('booking-view-mode');
    return (saved as ViewMode) || 'list';
  });
  const navigate = useNavigate();

  const skipSearchPageReset = useRef(true);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    if (skipSearchPageReset.current) {
      skipSearchPageReset.current = false;
      return;
    }
    setCurrentPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    persistFilters({
      searchQuery: searchTerm,
      statusFilter,
      bookingTypeFilter,
      createdFrom: createdDateRange?.from?.toISOString(),
      createdTo: createdDateRange?.to?.toISOString(),
      onlyMine,
    });
  }, [searchTerm, statusFilter, bookingTypeFilter, createdDateRange, onlyMine]);

  const buildBody = useCallback(() => {
    const created = rangeToApi(createdDateRange);
    // When no explicit status is picked, scope the query server-side to what this role is allowed to see,
    // instead of fetching everything and filtering client-side after pagination (see ROLE_VISIBLE_STATUSES).
    const roleStatuses = statusFilter === 'All' ? ROLE_VISIBLE_STATUSES[userRole] : undefined;
    return {
      page: currentPage,
      pageSize,
      searchQuery: debouncedSearch.trim() || undefined,
      status: statusFilter !== 'All' ? statusFilter : undefined,
      statuses: roleStatuses,
      // NOC only deals with Incoming Feed requests — Download/Camera Card ingest bookings aren't theirs.
      bookingType: userRole === 'NOC' ? 'Incoming Feed' : (bookingTypeFilter !== 'All' ? bookingTypeFilter : undefined),
      createdAtFrom: created.from ?? null,
      createdAtTo: created.to ?? null,
      // Requester self-filter — Booking screen only.
      createdBy: userRole === 'Booking' && onlyMine && user?.id ? user.id : undefined,
    };
  }, [currentPage, pageSize, debouncedSearch, statusFilter, bookingTypeFilter, createdDateRange, userRole, onlyMine, user]);

  const runSearch = useCallback(async () => {
    setLoading(true);
    try {
      const body = buildBody();
      const res = await mockApi.searchBookingRequests(
        {
          page: body.page,
          pageSize: body.pageSize,
          searchQuery: body.searchQuery ?? null,
          status: body.status ?? null,
          statuses: body.statuses ?? null,
          bookingType: body.bookingType ?? null,
          createdAtFrom: body.createdAtFrom,
          createdAtTo: body.createdAtTo,
          createdBy: body.createdBy ?? null,
        },
        userRole
      );
      setItems(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (e) {
      console.error('Booking search failed:', e);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [buildBody, userRole]);

  useEffect(() => {
    runSearch();
  }, [runSearch, refreshSignal]);

  const fetchPending = useCallback(async () => {
    if (!pendingConfig) return;
    setPendingLoading(true);
    try {
      const res = await mockApi.searchBookingRequests(
        {
          page: 1,
          pageSize: PENDING_POPUP_LIMIT,
          statuses: pendingConfig.statuses,
          bookingType: userRole === 'NOC' ? 'Incoming Feed' : null,
        },
        userRole
      );
      setPendingItems(res.items ?? []);
      setPendingTotal(res.total ?? 0);
    } catch (e) {
      console.error('Failed to load pending requests:', e);
      setPendingItems([]);
      setPendingTotal(0);
    } finally {
      setPendingLoading(false);
    }
  }, [pendingConfig, userRole]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending, refreshSignal]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('booking-view-mode', mode);
  };

  const handlePageSizeChange = (n: number) => {
    setPageSize(n);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    !!searchTerm.trim() ||
    statusFilter !== 'All' ||
    bookingTypeFilter !== 'All' ||
    !!(createdDateRange?.from || createdDateRange?.to) ||
    onlyMine;

  const clearAllFilters = () => {
    setCurrentPage(1);
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('All');
    setBookingTypeFilter('All');
    setCreatedDateRange(undefined);
    setOnlyMine(false);
  };

  const formatRangeChip = (range: DateRange | undefined) => {
    if (!range?.from && !range?.to) return null;
    const a = range.from ? range.from.toLocaleDateString() : '…';
    const b = range.to ? range.to.toLocaleDateString() : '…';
    return `${a} – ${b}`;
  };

  const createdChipText = formatRangeChip(createdDateRange);

  const statuses: (WorkflowStatus | 'All')[] = LIST_STATUSES;

  return (
    <div className="space-y-6">
      <>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
              <button
                type="button"
                onClick={() => handleViewModeChange('grid')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-card-foreground'
                }`}
                title="Grid view"
              >
                <Grid3x3 size={18} />
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange('list')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-card-foreground'
                }`}
                title="List view"
              >
                <List size={18} />
              </button>
            </div>

            {pendingConfig && (
              <button
                type="button"
                onClick={() => setPendingOpen(true)}
                className="relative flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30 transition-colors font-medium whitespace-nowrap"
              >
                {pendingTotal > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-red-500" />
                  </span>
                )}
                <ListChecks size={18} />
                Pending Requests
                <Badge className="bg-amber-600 text-white hover:bg-amber-600">{pendingTotal}</Badge>
              </button>
            )}

            <div className="flex-1" />

            {userRole === 'Booking' && (
              <button
                type="button"
                onClick={onCreateNew}
                className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium whitespace-nowrap"
              >
                <Plus size={18} />
                Create
              </button>
            )}
          </div>

          <ListFilterBar
            activeFiltersRow={
              hasActiveFilters ? (
                <FilterActiveFiltersRow onClearAll={clearAllFilters}>
                  {statusFilter !== 'All' && (
                    <Badge variant="secondary" className="gap-1">
                      <Tag size={12} />
                      {statusFilter}
                      <button
                        type="button"
                        onClick={() => setStatusFilter('All')}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full"
                        aria-label="Remove status filter"
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  )}
                  {bookingTypeFilter !== 'All' && (
                    <Badge variant="secondary" className="gap-1">
                      <Layers size={12} />
                      {getBookingTypeLabel(bookingTypeFilter)}
                      <button
                        type="button"
                        onClick={() => setBookingTypeFilter('All')}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full"
                        aria-label="Remove booking type filter"
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  )}
                  {createdChipText && (
                    <Badge variant="secondary" className="gap-1">
                      <Calendar size={12} />
                      Created: {createdChipText}
                      <button
                        type="button"
                        onClick={() => setCreatedDateRange(undefined)}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full"
                        aria-label="Remove created date filter"
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  )}
                  {searchTerm.trim() && (
                    <Badge variant="secondary" className="gap-1">
                      <Search size={12} />
                      &quot;{searchTerm}&quot;
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full"
                        aria-label="Remove search"
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  )}
                  {onlyMine && (
                    <Badge variant="secondary" className="gap-1">
                      <User size={12} />
                      My requests
                      <button
                        type="button"
                        onClick={() => setOnlyMine(false)}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full"
                        aria-label="Remove my requests filter"
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  )}
                </FilterActiveFiltersRow>
              ) : undefined
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  placeholder="Search title, program, studio, notes, guest…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setCurrentPage(1);
                  setStatusFilter(value as StatusFilter);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All states" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All states</SelectItem>
                  {statuses
                    .filter((s) => s !== 'All')
                    .map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {userRole !== 'NOC' && (
                <Select
                  value={bookingTypeFilter}
                  onValueChange={(value) => {
                    setCurrentPage(1);
                    setBookingTypeFilter(value as BookingTypeFilter);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All booking types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All booking types</SelectItem>
                    {BOOKING_TYPES.map((bt) => (
                      <SelectItem key={bt} value={bt}>
                        {getBookingTypeLabel(bt)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <DateRangePicker
                value={createdDateRange}
                onChange={(r) => {
                  setCurrentPage(1);
                  setCreatedDateRange(r);
                }}
                className="w-full"
              />
            </div>

            {userRole === 'Booking' && (
              <div className="flex items-center gap-2.5 pt-1">
                <Switch
                  id="only-mine"
                  checked={onlyMine}
                  onCheckedChange={(checked) => {
                    setCurrentPage(1);
                    setOnlyMine(checked);
                  }}
                />
                <Label htmlFor="only-mine" className="text-sm font-normal text-muted-foreground cursor-pointer">
                  Show my requests only
                </Label>
              </div>
            )}
          </ListFilterBar>

          <ListPaginationBar
            currentPage={currentPage}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={handlePageSizeChange}
            storageKey={PAGINATION_STORAGE_KEY}
            disabled={loading}
          />

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
          ) : total === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">No requests found</p>
              {userRole === 'Booking' && (
                <button
                  type="button"
                  onClick={onCreateNew}
                  className="mt-4 text-primary hover:text-primary/80 font-medium"
                >
                  Create your first request
                </button>
              )}
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      isNew={userRole === 'NOC' && request.__isNew}
                      onClick={() => navigate(`/${userRole.toLowerCase()}/requests/${request.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                  <div className="overflow-x-auto">
                    <Table className={GRID_CLASS}>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className={cn(headClass, 'w-[90px]')}>ID</TableHead>
                          <TableHead className={headClass}>Title</TableHead>
                          <TableHead className={cn(headClass, 'w-[180px]')}>Program</TableHead>
                          <TableHead className={cn(headClass, 'w-[190px]')}>Booking type</TableHead>
                          <TableHead className={cn(headClass, 'w-[190px]')}>State</TableHead>
                          <TableHead className={cn(headClass, 'w-[110px]')}>Priority</TableHead>
                          <TableHead className={cn(headClass, 'w-[170px]')}>Created by</TableHead>
                          <TableHead className={cn(headClass, 'w-[130px]')}>Created</TableHead>
                          <TableHead className={cn(headClass, 'w-[70px] text-right')}>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((request) => {
                          const creatorName = request.createdByUser?.displayName ?? request.createdBy;
                          return (
                            <TableRow
                              key={request.id}
                              onClick={() =>
                                navigate(`/${userRole.toLowerCase()}/requests/${request.id}`)
                              }
                              className={cn(
                                'group cursor-pointer transition-colors hover:bg-muted/30',
                                request.__isNew && 'bg-primary/[0.03]',
                              )}
                            >
                              <TableCell
                                className={cn(
                                  'py-3 font-mono text-xs tabular-nums text-muted-foreground',
                                  request.__isNew && 'border-l-2 border-l-primary',
                                )}
                              >
                                {request.id}
                              </TableCell>
                              <TableCell className="max-w-[360px] py-3">
                                <p
                                  className="flex items-center font-medium text-card-foreground"
                                  title={request.title}
                                >
                                  <span className="truncate">{request.title}</span>
                                  {request.__isNew && (
                                    <span className="ml-2 inline-flex items-center gap-1 align-middle text-[11px] font-semibold text-destructive">
                                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
                                      New
                                    </span>
                                  )}
                                </p>
                              </TableCell>
                              <TableCell className="max-w-[200px] py-3 text-sm">
                                {request.program ? (
                                  <span className="block truncate" title={request.program}>
                                    {request.program}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/50">—</span>
                                )}
                              </TableCell>
                              <TableCell className="py-3">
                                <BookingTypePill type={request.bookingType} />
                              </TableCell>
                              <TableCell className="py-3">
                                <StatusPill tone={STATUS_TONES[request.status] ?? 'muted'}>{request.status}</StatusPill>
                              </TableCell>
                              <TableCell className="py-3">
                                <StatusPill
                                  tone={PRIORITY_TONES[request.priority] ?? 'muted'}
                                  ping={request.priority === 'Urgent'}
                                >
                                  {request.priority}
                                </StatusPill>
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="flex items-center gap-2">
                                  <UserAvatar name={creatorName} />
                                  <span className="truncate text-sm">{creatorName}</span>
                                </div>
                              </TableCell>
                              <TableCell
                                className="py-3 text-xs tabular-nums text-muted-foreground"
                                title={new Date(request.createdAt).toLocaleString()}
                              >
                                {formatDistanceToNowStrict(new Date(request.createdAt), { addSuffix: true })}
                              </TableCell>
                              <TableCell className="py-3 text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground"
                                  title="Edit"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/${userRole.toLowerCase()}/requests/${request.id}`);
                                  }}
                                >
                                  <Edit size={15} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          )}
      </>

      <Dialog
        open={pendingOpen}
        onOpenChange={(open) => {
          setPendingOpen(open);
          if (!open) setPendingSearch('');
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-amber-600" />
              Pending Requests
            </DialogTitle>
            <DialogDescription>{pendingConfig?.description}</DialogDescription>
          </DialogHeader>

          {pendingItems.length > 8 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by title, program, or requester…"
                value={pendingSearch}
                onChange={(e) => setPendingSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          )}

          <div className="max-h-[60vh] overflow-y-auto -mx-1 px-1 space-y-2">
            {pendingLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
            ) : pendingItems.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Nothing pending — you're all caught up.
              </div>
            ) : filteredPendingItems.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No pending requests match &quot;{pendingSearch}&quot;.
              </div>
            ) : (
              filteredPendingItems.map((request, index) => (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => {
                    setPendingOpen(false);
                    navigate(`/${userRole.toLowerCase()}/requests/${request.id}`);
                  }}
                  className="w-full flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-card-foreground truncate">{request.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {request.program}
                      {request.createdByUser?.displayName ? ` · ${request.createdByUser.displayName}` : ''}
                      {' · '}
                      {new Date(request.createdAt).toDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge
                      className={
                        request.priority === 'Urgent'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : request.priority === 'High'
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }
                    >
                      {request.priority}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))
            )}
          </div>

          {pendingConfig && pendingTotal > pendingItems.length && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-3 py-2.5 text-sm">
              <span className="text-amber-800 dark:text-amber-400">
                Showing the first {pendingItems.length} of {pendingTotal} pending — the rest are still there.
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="flex-shrink-0 gap-1.5"
                onClick={() => {
                  setPendingOpen(false);
                  setCurrentPage(1);
                  setStatusFilter(pendingConfig.statuses[0] as StatusFilter);
                }}
              >
                View full list
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
