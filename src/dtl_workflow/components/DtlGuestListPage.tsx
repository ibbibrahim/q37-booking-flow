import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ListFilterBar } from '@/components/ui/list-filter-bar';
import {
  ListPaginationBar,
  getInitialPage,
  getInitialPageSize,
} from '@/components/ui/list-pagination-bar';
import { listDtlGuests } from '../services/dtlApi';
import { useDtlPermissions } from '../hooks/useDtlRole';
import type { DtlGuest } from '../types/dtl';
import { CreateDtlGuestModal } from './CreateDtlGuestModal';
import { EditDtlGuestModal } from './EditDtlGuestModal';
import { ManageDtlProgramsModal } from './ManageDtlProgramsModal';

const PAGINATION_STORAGE_KEY = 'dtl-guest-list';

export function DtlGuestListPage() {
  const queryClient = useQueryClient();
  const perms = useDtlPermissions();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(() => getInitialPage(PAGINATION_STORAGE_KEY));
  const [pageSize, setPageSize] = useState(() => getInitialPageSize(PAGINATION_STORAGE_KEY, 10));
  const [showCreate, setShowCreate] = useState(false);
  const [editingGuest, setEditingGuest] = useState<DtlGuest | null>(null);
  const [showPrograms, setShowPrograms] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 350);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dtl-guests', page, pageSize, search],
    queryFn: () => listDtlGuests({ page, perPage: pageSize, search }),
    placeholderData: (prev) => prev,
  });

  const items = data?.items ?? [];
  const totalItems = data?.totalItems ?? 0;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['dtl-guests'] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex-1" />
        {perms.canManagePrograms && (
          <button
            type="button"
            onClick={() => setShowPrograms(true)}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors font-medium whitespace-nowrap text-sm"
          >
            <Tag size={16} />
            Programs
          </button>
        )}
        {perms.canCreateGuest && (
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
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
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
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Email</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Phone</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">WhatsApp</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Company</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Country</th>
                {perms.canEditGuest && (
                  <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap" />
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={perms.canEditGuest ? 7 : 6} className="py-16 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={perms.canEditGuest ? 7 : 6} className="py-16 text-center text-destructive">
                    Could not load guests. Check your connection and try again.
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={perms.canEditGuest ? 7 : 6} className="py-16 text-center text-muted-foreground">
                    No guests found.
                  </td>
                </tr>
              ) : (
                items.map((g) => (
                  <tr key={g.id} className="border-b border-border transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-card-foreground">{g.name || '—'}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{g.email || '—'}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{g.phone || '—'}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{g.whatsapp || '—'}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{g.company || '—'}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{g.country || '—'}</td>
                    {perms.canEditGuest && (
                      <td className="py-3 px-4 text-sm">
                        <button
                          type="button"
                          onClick={() => setEditingGuest(g)}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateDtlGuestModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setPage(1);
          setSearch('');
          setSearchInput('');
          invalidate();
        }}
      />

      <EditDtlGuestModal
        guest={editingGuest}
        onClose={() => setEditingGuest(null)}
        onUpdated={() => invalidate()}
      />

      <ManageDtlProgramsModal open={showPrograms} onClose={() => setShowPrograms(false)} />
    </div>
  );
}
