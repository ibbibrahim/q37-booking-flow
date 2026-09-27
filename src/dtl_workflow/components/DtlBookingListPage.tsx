import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ListFilterBar } from '@/components/ui/list-filter-bar';
import {
  ListPaginationBar,
  getInitialPage,
  getInitialPageSize,
} from '@/components/ui/list-pagination-bar';
import { listDtlBookings, type DtlBookingSortBy } from '../services/dtlApi';
import { formatDtlTimeShort } from '../services/dtlHistory';
import { useDtlPermissions } from '../hooks/useDtlRole';
import { useDtlBookingChanged } from '../hooks/useDtlBookingChanged';
import { DTL_BOOKING_STATUS } from '../types/dtl';
import { CreateDtlBookingModal } from './CreateDtlBookingModal';
import { ArrowDown, ArrowUp } from 'lucide-react';

const PAGINATION_STORAGE_KEY = 'dtl-booking-list';
const STATUS_OPTIONS = ['All', DTL_BOOKING_STATUS.Created, DTL_BOOKING_STATUS.Completed, DTL_BOOKING_STATUS.Cancelled];

const statusColors: Record<string, string> = {
  created: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  Completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  Cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

export function DtlBookingListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const perms = useDtlPermissions();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(() => getInitialPage(PAGINATION_STORAGE_KEY));
  const [pageSize, setPageSize] = useState(() => getInitialPageSize(PAGINATION_STORAGE_KEY, 10));
  const [showCreate, setShowCreate] = useState(false);
  const [sortBy, setSortBy] = useState<DtlBookingSortBy>('time');
  const [sortDescending, setSortDescending] = useState(true);

  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 350);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dtl-bookings', page, pageSize, search, status, sortBy, sortDescending],
    queryFn: () =>
      listDtlBookings({
        page,
        perPage: pageSize,
        search,
        status: status === 'All' ? undefined : status,
        sortBy,
        sortDescending,
      }),
    placeholderData: (prev) => prev,
  });

  useDtlBookingChanged(() => {
    queryClient.invalidateQueries({ queryKey: ['dtl-bookings'] });
  });

  function toggleSort(column: DtlBookingSortBy) {
    if (sortBy === column) {
      setSortDescending((prev) => !prev);
    } else {
      setSortBy(column);
      setSortDescending(true);
    }
    setPage(1);
  }

  const items = data?.items ?? [];
  const totalItems = data?.totalItems ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex-1" />
        {perms.canCreateBooking && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium whitespace-nowrap"
          >
            <Plus size={18} />
            Create
          </button>
        )}
      </div>

      <ListFilterBar>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search program, guest, status, created by…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => {
              setPage(1);
              setStatus(v);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === 'All' ? 'All statuses' : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </ListFilterBar>

      <ListPaginationBar
        currentPage={page}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPage(1);
          setPageSize(n);
        }}
        storageKey={PAGINATION_STORAGE_KEY}
        disabled={isLoading}
      />

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                  <button type="button" onClick={() => toggleSort('id')} className="inline-flex items-center gap-1 hover:text-primary">
                    ID
                    {sortBy === 'id' && (sortDescending ? <ArrowDown size={14} /> : <ArrowUp size={14} />)}
                  </button>
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Program</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Guest</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Created By</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                  <button type="button" onClick={() => toggleSort('time')} className="inline-flex items-center gap-1 hover:text-primary">
                    Time
                    {sortBy === 'time' && (sortDescending ? <ArrowDown size={14} /> : <ArrowUp size={14} />)}
                  </button>
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Duration</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-destructive">
                    Could not load bookings. Check your connection and try again.
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground">
                    No bookings found.
                  </td>
                </tr>
              ) : (
                items.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/dtl-booking/requests/${b.id}`)}
                  >
                    <td className="py-3 px-4 text-sm text-muted-foreground font-mono">{b.id}</td>
                    <td className="py-3 px-4 text-sm font-medium text-card-foreground">{b.programName || '—'}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{b.guestName || '—'}</td>
                    <td className="py-3 px-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          statusColors[b.status] ??
                          'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {b.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">{b.createdBy || '—'}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {b.time ? formatDtlTimeShort(b.time) : '—'}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {b.durationMinutes != null ? `${b.durationMinutes} min` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateDtlBookingModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setPage(1);
          setSearch('');
          setSearchInput('');
          queryClient.invalidateQueries({ queryKey: ['dtl-bookings'] });
        }}
      />
    </div>
  );
}
