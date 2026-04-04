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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { endOfDay, startOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';

import { RequestCard } from './RequestCard';
import {
  getBookingTypeLabel,
  type WorkflowRequest,
  type WorkflowStatus,
  type UserRole,
  type BookingType,
} from '../types/workflow';
import { mockApi } from '../services/bookingApi';

import { DateRangePicker } from '@/components/DateRangePicker';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ListFilterBar, FilterActiveFiltersRow } from '@/components/ui/list-filter-bar';
import { ListPaginationBar, getInitialPage, getInitialPageSize } from '@/components/ui/list-pagination-bar';

const PAGINATION_STORAGE_KEY = 'booking-workflow:list';
const FILTERS_STORAGE_KEY = 'booking-workflow:list:filters:v1';

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
      };
    }
    const parsed = JSON.parse(raw) as PersistedFilters;
    return {
      searchQuery: typeof parsed.searchQuery === 'string' ? parsed.searchQuery : '',
      statusFilter: (parsed.statusFilter as StatusFilter) ?? 'All',
      bookingTypeFilter: (parsed.bookingTypeFilter as BookingTypeFilter) ?? 'All',
      createdFrom: parsed.createdFrom,
      createdTo: parsed.createdTo,
    };
  } catch {
    return {
      searchQuery: '',
      statusFilter: 'All',
      bookingTypeFilter: 'All',
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

const statusColors: Record<WorkflowStatus, { bg: string; text: string }> = {
  Draft: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300' },
  Submitted: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  'With NOC': { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
  'Clarification Requested': {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-400',
  },
  'Resources Added': {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-700 dark:text-indigo-400',
  },
  'With Ingest': { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-400' },
  Completed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  'Not Done': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
  'Partially Completed': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
};

const priorityColors = {
  Normal: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  High: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  Urgent: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const bookingTypeColors: Record<string, string> = {
  'Live Broadcast': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  'Incoming Feed': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  'Invite Guest for News': 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
  'Invite Guest for Program': 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
  'Download and Ingest': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  'Camera Card and Ingest': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
};

const LIST_STATUSES: (WorkflowStatus | 'All')[] = [
  'All',
  'Draft',
  'With NOC',
  'Clarification Requested',
  'With Ingest',
  'Completed',
  'Not Done',
];

const BOOKING_TYPES: BookingType[] = [
  'Incoming Feed',
  'Invite Guest for News',
  'Invite Guest for Program',
  'Download and Ingest',
  'Camera Card and Ingest',
];

export const RequestList: React.FC<RequestListProps> = ({
  userRole,
  onCreateNew,
  refreshSignal = 0,
}) => {
  const persisted = useMemo(() => loadPersistedFilters(), []);
  const [searchTerm, setSearchTerm] = useState(persisted.searchQuery);
  const [debouncedSearch, setDebouncedSearch] = useState(persisted.searchQuery);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(persisted.statusFilter);
  const [bookingTypeFilter, setBookingTypeFilter] = useState<BookingTypeFilter>(persisted.bookingTypeFilter);
  const [createdDateRange, setCreatedDateRange] = useState<DateRange | undefined>(() =>
    parseIsoDateRange(persisted.createdFrom, persisted.createdTo)
  );

  const [items, setItems] = useState<WorkflowRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

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
    });
  }, [searchTerm, statusFilter, bookingTypeFilter, createdDateRange]);

  const buildBody = useCallback(() => {
    const created = rangeToApi(createdDateRange);
    return {
      page: currentPage,
      pageSize,
      searchQuery: debouncedSearch.trim() || undefined,
      status: statusFilter !== 'All' ? statusFilter : undefined,
      bookingType: bookingTypeFilter !== 'All' ? bookingTypeFilter : undefined,
      createdAtFrom: created.from ?? null,
      createdAtTo: created.to ?? null,
    };
  }, [currentPage, pageSize, debouncedSearch, statusFilter, bookingTypeFilter, createdDateRange]);

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
          bookingType: body.bookingType ?? null,
          createdAtFrom: body.createdAtFrom,
          createdAtTo: body.createdAtTo,
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
    !!(createdDateRange?.from || createdDateRange?.to);

  const clearAllFilters = () => {
    setCurrentPage(1);
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('All');
    setBookingTypeFilter('All');
    setCreatedDateRange(undefined);
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
              <DateRangePicker
                value={createdDateRange}
                onChange={(r) => {
                  setCurrentPage(1);
                  setCreatedDateRange(r);
                }}
                className="w-full"
              />
            </div>
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
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                            ID
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                            Title
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                            Program
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                            Booking Type
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                            State
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                            Priority
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                            Created By
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                            Created At
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((request) => {
                          const statusStyle = statusColors[request.status];
                          const priorityColor = priorityColors[request.priority];
                          const bookingTypeColor =
                            bookingTypeColors[request.bookingType] ||
                            'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400';

                          return (
                            <tr
                              key={request.id}
                              className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                              onClick={() =>
                                navigate(`/${userRole.toLowerCase()}/requests/${request.id}`)
                              }
                            >
                              <td className="py-3 px-4 text-sm text-muted-foreground font-mono">
                                {request.id}
                              </td>
                              <td className="py-3 px-4 text-sm font-medium text-card-foreground">
                                {request.title}
                                {request.__isNew && (
                                  <span className="ml-2 text-xs font-semibold text-red-600 animate-pulse">
                                    ● New
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm text-muted-foreground">
                                {request.program}
                              </td>
                              <td className="py-3 px-4 text-sm">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${bookingTypeColor}`}
                                >
                                  {getBookingTypeLabel(request.bookingType)}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                                >
                                  {request.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${priorityColor}`}
                                >
                                  {request.priority}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm">
                                {request.createdByUser?.displayName ?? request.createdBy}
                              </td>
                              <td className="py-3 px-4 text-sm text-muted-foreground">
                                {new Date(request.createdAt).toDateString()}
                              </td>
                              <td className="py-3 px-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/${userRole.toLowerCase()}/requests/${request.id}`);
                                    }}
                                    className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-card-foreground"
                                    title="Edit"
                                  >
                                    <Edit size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
      </>
    </div>
  );
};
