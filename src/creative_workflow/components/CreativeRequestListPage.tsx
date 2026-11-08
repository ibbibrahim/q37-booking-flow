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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusPill } from '@/components/ui/status-pill';
import { UserAvatar } from '@/components/ui/user-avatar';
import type { Tone } from '@/lib/tone';
import { cn } from '@/lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { listCreativeRequests } from '../services/creativeApi';
import { useCreativeRequestChanged } from '../hooks/useCreativeRequestChanged';
import {
  CREATIVE_REQUEST_STATUS,
  CREATIVE_REQUEST_TYPE_LABEL,
  creativePermissionsFor,
  visibleRequestTypesFor,
} from '../types/creative';

const PAGINATION_STORAGE_KEY = 'creative-request-list';
const STATUS_OPTIONS = [
  'All',
  CREATIVE_REQUEST_STATUS.Submitted,
  CREATIVE_REQUEST_STATUS.Completed,
  CREATIVE_REQUEST_STATUS.NeedsRevision,
  CREATIVE_REQUEST_STATUS.Approved,
];

const headClass = 'h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';
const GRID_CLASS =
  'min-w-[1000px] [&_th]:border-r [&_td]:border-r [&_th]:border-border/70 [&_td]:border-border/70 [&_th:last-child]:border-r-0 [&_td:last-child]:border-r-0';

const STATUS_TONES: Record<string, Tone> = {
  Submitted: 'warning',
  Completed: 'info',
  NeedsRevision: 'destructive',
  Approved: 'success',
};

const PRIORITY_TONES: Record<string, Tone> = {
  Normal: 'muted',
  Urgent: 'destructive',
};

export function CreativeRequestListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const perms = creativePermissionsFor(user?.roles ?? []);
  const visibleTypes = visibleRequestTypesFor(user?.roles ?? []);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [requestType, setRequestType] = useState('All');
  const [page, setPage] = useState(() => getInitialPage(PAGINATION_STORAGE_KEY));
  const [pageSize, setPageSize] = useState(() => getInitialPageSize(PAGINATION_STORAGE_KEY, 10));

  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 350);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['creative-requests', page, pageSize, search, status, requestType],
    queryFn: () =>
      listCreativeRequests({
        page,
        perPage: pageSize,
        search,
        status: status === 'All' ? undefined : status,
        requestType: requestType === 'All' ? undefined : requestType,
      }),
    placeholderData: (prev) => prev,
  });

  useCreativeRequestChanged(() => {
    queryClient.invalidateQueries({ queryKey: ['creative-requests'] });
  });

  const items = data?.items ?? [];
  const totalItems = data?.totalItems ?? 0;
  const canCreate = perms.canCreateSocialMediaHeadline || perms.canCreateProducerRequest;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex-1" />
        {canCreate && (
          <button
            type="button"
            onClick={() => navigate('/creative-requests/new')}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium whitespace-nowrap"
          >
            <Plus size={18} />
            New Request
          </button>
        )}
      </div>

      <ListFilterBar>
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search program…"
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
          <Select
            value={requestType}
            onValueChange={(v) => {
              setPage(1);
              setRequestType(v);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All types</SelectItem>
              {visibleTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {CREATIVE_REQUEST_TYPE_LABEL[t]}
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

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table className={GRID_CLASS}>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className={cn(headClass, 'w-[80px]')}>ID</TableHead>
                <TableHead className={cn(headClass, 'w-[320px]')}>Title</TableHead>
                <TableHead className={cn(headClass, 'w-[170px]')}>Type</TableHead>
                <TableHead className={cn(headClass, 'w-[150px]')}>Status</TableHead>
                <TableHead className={cn(headClass, 'w-[110px]')}>Priority</TableHead>
                <TableHead className={cn(headClass, 'w-[170px]')}>Air date</TableHead>
                <TableHead className={cn(headClass, 'w-[200px]')}>Requested by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="py-16 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="py-16 text-center text-destructive">
                    Could not load requests. Check your connection and try again.
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="py-16 text-center text-muted-foreground">
                    No requests found.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((r) => (
                  <TableRow
                    key={r.id}
                    className="group cursor-pointer transition-colors hover:bg-muted/30"
                    onClick={() => navigate(`/creative-requests/${r.id}`)}
                  >
                    <TableCell className="py-3 font-mono text-xs tabular-nums text-muted-foreground">
                      {r.id}
                    </TableCell>
                    <TableCell className="max-w-[360px] py-3">
                      <p className="truncate font-medium text-card-foreground" title={r.title}>
                        {r.title}
                      </p>
                      {r.program && <p className="truncate text-xs text-muted-foreground">{r.program}</p>}
                    </TableCell>
                    <TableCell className="py-3 text-sm">
                      {CREATIVE_REQUEST_TYPE_LABEL[r.requestType] ?? r.requestType}
                    </TableCell>
                    <TableCell className="py-3">
                      <StatusPill tone={STATUS_TONES[r.status] ?? 'muted'}>{r.status}</StatusPill>
                    </TableCell>
                    <TableCell className="py-3">
                      <StatusPill tone={PRIORITY_TONES[r.priority] ?? 'muted'} ping={r.priority === 'Urgent'}>
                        {r.priority}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="py-3 text-xs tabular-nums text-muted-foreground">
                      {new Date(r.airDate).toLocaleDateString()} {r.airTime}
                    </TableCell>
                    <TableCell className="py-3">
                      {r.createdByName ? (
                        <div className="flex items-center gap-2">
                          <UserAvatar name={r.createdByName} />
                          <span className="truncate text-sm">{r.createdByName}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
