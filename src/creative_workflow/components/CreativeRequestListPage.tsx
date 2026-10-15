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
import { useAuth } from '../../contexts/AuthContext';
import { listCreativeRequests } from '../services/creativeApi';
import { useCreativeRequestChanged } from '../hooks/useCreativeRequestChanged';
import {
  CREATIVE_REQUEST_STATUS,
  CREATIVE_REQUEST_TYPE_LABEL,
  creativePermissionsFor,
  type CreativeRequestType,
} from '../types/creative';

const PAGINATION_STORAGE_KEY = 'creative-request-list';
const STATUS_OPTIONS = [
  'All',
  CREATIVE_REQUEST_STATUS.Submitted,
  CREATIVE_REQUEST_STATUS.Completed,
  CREATIVE_REQUEST_STATUS.NeedsRevision,
  CREATIVE_REQUEST_STATUS.Approved,
];

const statusColors: Record<string, string> = {
  Submitted: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  Completed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  NeedsRevision: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  Approved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
};

const priorityColors: Record<string, string> = {
  Normal: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  Urgent: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

export function CreativeRequestListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const perms = creativePermissionsFor(user?.roles ?? []);

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
              {(Object.keys(CREATIVE_REQUEST_TYPE_LABEL) as CreativeRequestType[]).map((t) => (
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

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">ID</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Title</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Program</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Priority</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Air Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Requested By</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-destructive">
                    Could not load requests. Check your connection and try again.
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-muted-foreground">
                    No requests found.
                  </td>
                </tr>
              ) : (
                items.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/creative-requests/${r.id}`)}
                  >
                    <td className="py-3 px-4 text-sm text-muted-foreground font-mono">{r.id}</td>
                    <td className="py-3 px-4 text-sm font-medium text-card-foreground">{r.title}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {CREATIVE_REQUEST_TYPE_LABEL[r.requestType] ?? r.requestType}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{r.program || '—'}</td>
                    <td className="py-3 px-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          statusColors[r.status] ??
                          'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${priorityColors[r.priority] ?? ''}`}>
                        {r.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {new Date(r.airDate).toLocaleDateString()} {r.airTime}
                    </td>
                    <td className="py-3 px-4 text-sm">{r.createdByName || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
