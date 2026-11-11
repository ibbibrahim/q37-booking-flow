import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Calendar, User, Search, Filter, Grid3x3, List, Check, Mail, Minus, History } from 'lucide-react';
import { addDays, startOfToday, endOfToday, startOfTomorrow, endOfTomorrow, endOfDay, startOfMonth, endOfMonth, format, formatDistanceToNowStrict } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { callSheetApi } from '../services/mockCallSheetApi';
import { useAuth } from '@/contexts/AuthContext';
import { useSignalR } from '@/contexts/SignalRContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/DateRangePicker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/user-avatar';
import { StatusPill } from '@/components/ui/status-pill';
import type { Tone } from '@/lib/tone';
import type { CallSheetRequest, CallSheetStatus } from '../types/callsheet';
import { formatQatarDateTime } from '../utils/timezone';
import { readCallsheetDraftSummary } from '../utils/callsheetDraft';
import { CallsheetWeeklyCalendar } from './CallsheetWeeklyCalendar';
import { formatDateTime } from '@/studio_booking/utils/timeUtils';
import { CallSheetPageLoader } from './CallSheetPageLoader';
import { ListPaginationBar, getInitialPage, getInitialPageSize } from '@/components/ui/list-pagination-bar';

const PAGINATION_STORAGE_KEY = 'callsheet-workflow:list';

const headClass = 'h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';
const GRID_CLASS =
  'min-w-[1320px] [&_th]:border-r [&_td]:border-r [&_th]:border-border/70 [&_td]:border-border/70 [&_th:last-child]:border-r-0 [&_td:last-child]:border-r-0';

const STATUS_TONES: Record<CallSheetStatus, Tone> = {
  Draft: 'muted',
  'With Technical Store': 'warning',
  Submitted: 'info',
  Completed: 'success',
  Cancelled: 'destructive',
};


type ViewMode = 'grid' | 'list';

export const CallSheetDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unfinishedCallsheet] = useState(() => readCallsheetDraftSummary(user?.id ?? 'anon'));
  const { listen, isConnected } = useSignalR();
  const [callSheets, setCallSheets] = useState<CallSheetRequest[]>([]);
  const [calendarCallSheets, setCalendarCallSheets] = useState<CallSheetRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(() => getInitialPage(PAGINATION_STORAGE_KEY, 1));
  const [pageSize, setPageSize] = useState(() => getInitialPageSize(PAGINATION_STORAGE_KEY, 20));

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [driverFilter, setDriverFilter] = useState<string>('All');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('callsheet_view_mode');
    return (saved as ViewMode) || 'list';
  });

  const isTechnicalStore = user?.roles?.includes('TechnicalStore') || false;

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('callsheet_view_mode', mode);
  };

  const skipSearchPageReset = useRef(true);

  // Debounce search query so we don't call API on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (skipSearchPageReset.current) {
      skipSearchPageReset.current = false;
      return;
    }
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  const buildFilterBody = useCallback(
    (page: number, size: number) => {
      const filters: Record<string, unknown> = {
        page,
        pageSize: size,
      };

      if (debouncedSearchQuery.trim()) {
        filters.searchQuery = debouncedSearchQuery.trim();
      }

      if (statusFilter && statusFilter !== 'All') {
        filters.status = statusFilter;
      }

      if (driverFilter !== 'All') {
        filters.driverNeeded = driverFilter === 'Yes';
      }

      if (dateRange?.from) {
        filters.dateFrom = format(dateRange.from, 'yyyy-MM-dd');
      }
      if (dateRange?.to) {
        filters.dateTo = format(dateRange.to, 'yyyy-MM-dd');
      }

      return filters;
    },
    [debouncedSearchQuery, statusFilter, driverFilter, dateRange]
  );

  const runSearch = useCallback(async () => {
    setLoading(true);
    try {
      const body = buildFilterBody(currentPage, pageSize);
      const res = await callSheetApi.searchCallSheets(body);
      setCallSheets(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (error) {
      console.error('Failed to load call sheets:', error);
      setCallSheets([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [buildFilterBody, currentPage, pageSize]);

  const loadCalendarCallSheets = useCallback(async () => {
    try {
      const body = buildFilterBody(1, 1000);
      const res = await callSheetApi.searchCallSheets(body);
      setCalendarCallSheets(res.items ?? []);
    } catch (error) {
      console.error('Failed to load calendar call sheets:', error);
      setCalendarCallSheets([]);
    }
  }, [buildFilterBody]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  useEffect(() => {
    loadCalendarCallSheets();
  }, [loadCalendarCallSheets]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handlePageSizeChange = (n: number) => {
    setPageSize(n);
    setCurrentPage(1);
  };

  // SignalR listeners for real-time updates
  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const unsubscribeCreated = listen('CallSheetCreated', (newCallSheet: CallSheetRequest) => {
      console.log('CallSheetCreated event received:', newCallSheet);

      const prependIfNew = (prev: CallSheetRequest[]) => {
        const exists = prev.some((cs) => cs.id === newCallSheet.id);
        if (exists) return prev;
        return [newCallSheet, ...prev];
      };

      if (isTechnicalStore) {
        if (newCallSheet.status === 'With Technical Store' && newCallSheet.driverNeeded) {
          setCallSheets(prependIfNew);
          setCalendarCallSheets(prependIfNew);
        }
      } else {
        setCallSheets(prependIfNew);
        setCalendarCallSheets(prependIfNew);
      }
    });

    const unsubscribeUpdatedByTechnicalStore = listen('CallSheetUpdatedByTechnicalStore', (updatedCallSheet: CallSheetRequest) => {
      console.log('CallSheetUpdatedByTechnicalStore event received:', updatedCallSheet);

      const applyUpdate = (prev: CallSheetRequest[]) => {
        if (isTechnicalStore) {
          if (updatedCallSheet.status !== 'Submitted' || !updatedCallSheet.driverNeeded) {
            return prev.filter((cs) => cs.id !== updatedCallSheet.id);
          }
        }

        const exists = prev.some((cs) => cs.id === updatedCallSheet.id);
        if (exists) {
          return prev.map((cs) => (cs.id === updatedCallSheet.id ? updatedCallSheet : cs));
        }

        if (isTechnicalStore && updatedCallSheet.status === 'Submitted' && updatedCallSheet.driverNeeded) {
          return [updatedCallSheet, ...prev];
        }

        return prev;
      };

      setCallSheets(applyUpdate);
      setCalendarCallSheets(applyUpdate);
    });

    return () => {
      unsubscribeCreated();
      unsubscribeUpdatedByTechnicalStore();
    };
  }, [isConnected, listen, isTechnicalStore]);

  const handleQuickDateFilter = (days: number | 'today' | 'tomorrow' | 'month') => {
    if (days === 'today') {
      setDateRange({ from: startOfToday(), to: endOfToday() });
    } else if (days === 'tomorrow') {
      setDateRange({ from: startOfTomorrow(), to: endOfTomorrow() });
    } else if (days === 'month') {
      setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
    } else if (typeof days === 'number') {
      setDateRange({ from: startOfToday(), to: addDays(startOfToday(), days - 1) });
    }
  };

  const statusColors: Record<string, string> = {
    'Draft': 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    'With Technical Store': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    'Submitted': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    'Completed': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    'Cancelled': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
          <button
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
        {!isTechnicalStore && unfinishedCallsheet && (
          <button
            type="button"
            onClick={() => navigate('/callsheet/new', { state: { resumeUnfinished: true } })}
            title={`${unfinishedCallsheet.title} — last edited ${formatDistanceToNowStrict(unfinishedCallsheet.savedAt, { addSuffix: true })}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <History className="h-3.5 w-3.5" />
            1 unfinished call sheet · Continue
          </button>
        )}
        {!isTechnicalStore && (
          <Button
            onClick={() => navigate('/callsheet/new')}
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">New Call Sheet</span>
            <span className="sm:hidden">New</span>
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-card rounded-lg border border-border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Search Input - Takes more space */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Date Range Picker */}
          <div className="md:col-span-3">
            <DateRangePicker
              value={dateRange}
              onChange={(r) => {
                setCurrentPage(1);
                setDateRange(r);
              }}
              className="w-full"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setCurrentPage(1);
                setStatusFilter(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="With Technical Store">With Technical Store</SelectItem>
                <SelectItem value="Submitted">Submitted</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Driver Filter */}
          <div className="md:col-span-2">
            <Select
              value={driverFilter}
              onValueChange={(value) => {
                setCurrentPage(1);
                setDriverFilter(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Driver Needed" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Yes">Driver Needed</SelectItem>
                <SelectItem value="No">No Driver</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>

        {/* Quick Date Filters */}
        {/* <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Quick filters:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickDateFilter('today')}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickDateFilter('tomorrow')}
          >
            Tomorrow
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickDateFilter(7)}
          >
            Next 7 Days
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickDateFilter('month')}
          >
            This Month
          </Button>
        </div> */}
      </div>

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
        <CallSheetPageLoader message="Loading call sheets..." />
      ) : (
        <>
      {/* Studio Timeline - Weekly View (Outlook style) */}
      <CallsheetWeeklyCalendar
        callsheets={calendarCallSheets}
        onOpenCallsheet={(id) => navigate(`/callsheet/${id}`)}
      />

      {total === 0 ? (
        <div className="text-center py-16 bg-card rounded-lg border border-border">
          <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-card-foreground mb-2">
            {isTechnicalStore ? 'No call sheets available' : 'No call sheets found'}
          </h3>
          <p className="text-muted-foreground mb-6">
            {isTechnicalStore
              ? 'No call sheets require technical store action at this time'
              : 'Try adjusting your filters or create a new call sheet'}
          </p>
          {!isTechnicalStore && (
            <Button
              onClick={() => navigate('/callsheet/new')}
              className="inline-flex items-center gap-2"
            >
              <Plus size={18} />
              Create Call Sheet
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {callSheets.map((callSheet) => {
            const isCancelled = callSheet.status === 'Cancelled';
            return (
              <div
                key={callSheet.id}
                onClick={() => navigate(`/callsheet/${callSheet.id}`)}
                className={`bg-card rounded-lg border border-border p-6 hover:shadow-lg transition-all cursor-pointer group ${
                  isCancelled ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className={`text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors mb-1 ${
                      isCancelled ? 'line-through' : ''
                    }`}>
                      {callSheet.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{callSheet.department}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[callSheet.status]}`}>
                      {callSheet.status}
                    </span>
                    {callSheet.alreadyAnnouncedEmail ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                        <Check className="h-3 w-3" />
                        Email Sent
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        <Minus className="h-3 w-3" />
                        Not Sent
                      </span>
                    )}
                  </div>
                </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar size={14} />
                  <span>{formatQatarDateTime(callSheet.startDateTime)}</span>
                </div>
                {callSheet.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText size={14} />
                    <span className="truncate">{callSheet.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User size={14} />
                  <span>{callSheet.createdByUser?.displayName || callSheet.createdByUser?.username || callSheet.createdBy}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {callSheet.transportRequest && (
                    <span>Transport requested</span>
                  )}
                  {callSheet.driverNeeded && (
                    <span className="text-orange-600 dark:text-orange-400 font-medium">
                      Driver needed
                    </span>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table className={GRID_CLASS}>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className={cn(headClass, 'w-[80px]')}>ID</TableHead>
                  <TableHead className={headClass}>Title</TableHead>
                  <TableHead className={cn(headClass, 'w-[140px]')}>Department</TableHead>
                  <TableHead className={cn(headClass, 'w-[170px]')}>Location</TableHead>
                  <TableHead className={cn(headClass, 'w-[110px]')}>Shoot type</TableHead>
                  <TableHead className={cn(headClass, 'w-[170px]')}>Status</TableHead>
                  <TableHead className={cn(headClass, 'w-[130px]')}>Announcement</TableHead>
                  <TableHead className={cn(headClass, 'w-[160px]')}>Call time</TableHead>
                  <TableHead className={cn(headClass, 'w-[160px]')}>Wrap time</TableHead>
                  <TableHead className={cn(headClass, 'w-[170px]')}>Created by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {callSheets.map((callSheet) => {
                  const isCancelled = callSheet.status === 'Cancelled';
                  const creatorName =
                    callSheet.createdByUser?.displayName || callSheet.createdByUser?.username;
                  return (
                    <TableRow
                      key={callSheet.id}
                      onClick={() => navigate(`/callsheet/${callSheet.id}`)}
                      className={cn(
                        'group cursor-pointer transition-colors hover:bg-muted/30',
                        isCancelled && 'opacity-60',
                      )}
                    >
                      <TableCell className="py-3 font-mono text-xs tabular-nums text-muted-foreground">
                        {callSheet.id}
                      </TableCell>
                      <TableCell className="max-w-[360px] py-3">
                        <p
                          className={cn(
                            'truncate font-medium text-card-foreground',
                            isCancelled && 'line-through',
                          )}
                          title={callSheet.title}
                        >
                          {callSheet.title}
                        </p>
                      </TableCell>
                      <TableCell className="py-3">
                        {callSheet.department ? (
                          <StatusPill tone="muted" ping={false}>
                            {callSheet.department}
                          </StatusPill>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-sm">
                        {callSheet.location ? (
                          <span className="truncate">{callSheet.location}</span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <StatusPill tone={callSheet.shootType === 'Indoor' ? 'info' : 'success'} ping={false}>
                          {callSheet.shootType}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="py-3">
                        <StatusPill tone={STATUS_TONES[callSheet.status] ?? 'muted'} ping={false}>
                          {callSheet.status}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="py-3">
                        {callSheet.alreadyAnnouncedEmail ? (
                          <StatusPill tone="success" ping={false}>
                            Email sent
                          </StatusPill>
                        ) : (
                          <StatusPill tone="muted" ping={false}>
                            Not sent
                          </StatusPill>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap py-3 text-xs tabular-nums text-muted-foreground">
                        {callSheet.startDateTime ? formatDateTime(callSheet.startDateTime) : '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap py-3 text-xs tabular-nums text-muted-foreground">
                        {callSheet.returnDateTime ? formatDateTime(callSheet.returnDateTime) : '—'}
                      </TableCell>
                      <TableCell className="py-3">
                        {creatorName ? (
                          <div className="flex items-center gap-2">
                            <UserAvatar name={creatorName} />
                            <div className="min-w-0">
                              <p className="truncate text-sm">{creatorName}</p>
                              {callSheet.createdAt && (
                                <p
                                  className="truncate text-xs tabular-nums text-muted-foreground"
                                  title={new Date(callSheet.createdAt).toLocaleString()}
                                >
                                  {formatDistanceToNowStrict(new Date(callSheet.createdAt), { addSuffix: true })}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
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
    </div>
  );
};
