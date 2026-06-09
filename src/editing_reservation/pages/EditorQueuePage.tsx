import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Grid3x3, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ListPaginationBar, getInitialPage, getInitialPageSize } from '@/components/ui/list-pagination-bar';
import { DateRangePicker } from '@/components/DateRangePicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditingRequestList } from '../components/EditingRequestList';
import { editingApi } from '../api/editingApi';
import { useAuth } from '@/contexts/AuthContext';
import { useSignalR } from '@/contexts/SignalRContext';
import type { EditingRequest } from '../types/editing';
import { DateRange } from 'react-day-picker';

type ViewMode = 'grid' | 'list';

const PAGINATION_STORAGE_KEY = 'editing-workflow:editor-queue';

function isAssignedToEditor(request: EditingRequest, editorId: number): boolean {
  if (request.editorId === editorId) return true;
  return request.editingSessions?.some((s) => s.editorId === editorId) ?? false;
}

export const EditorQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { listen, isConnected } = useSignalR();
  const [requests, setRequests] = useState<EditingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(() => getInitialPage(PAGINATION_STORAGE_KEY, 1));
  const [pageSize, setPageSize] = useState(() => getInitialPageSize(PAGINATION_STORAGE_KEY, 50));
  const [total, setTotal] = useState(0);
  const skipSearchPageReset = useRef(true);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('editing-view-mode');
    return (saved as ViewMode) || 'list';
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (skipSearchPageReset.current) {
      skipSearchPageReset.current = false;
      return;
    }
    setCurrentPage(1);
  }, [debouncedSearch]);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const statusFilter =
        activeTab === 'all' || activeTab === 'my-assignments' ? undefined : activeTab;
      const editorId =
        activeTab === 'my-assignments' && user?.id != null ? user.id : undefined;
      const result = await editingApi.search({
        searchQuery: debouncedSearch.trim() || undefined,
        status: statusFilter,
        editorId,
        dateFrom: dateRange?.from,
        dateTo: dateRange?.to,
        page: currentPage,
        pageSize,
      });
      const items = (result.items ?? []).filter((r) => !r.isManualBlock);
      setRequests(items);
      setTotal(result.total ?? 0);
    } catch (error) {
      console.error('Failed to load edit suite assignments:', error);
      setRequests([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedSearch, dateRange?.from, dateRange?.to, currentPage, pageSize, user?.id]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

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

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribeCreated = listen('EditingRequestCreated', (data: EditingRequest) => {
      setRequests((prev) => {
        const exists = prev.some((r) => r.id === data.id);
        if (exists) return prev;
        if (activeTab === 'my-assignments') {
          if (user?.id == null || !isAssignedToEditor(data, user.id)) return prev;
        } else if (activeTab !== 'all' && data.status !== activeTab) {
          return prev;
        }
        return [data, ...prev];
      });
    });

    const unsubscribeUpdated = listen('EditingRequestUpdated', (data: EditingRequest) => {
      setRequests((prev) => prev.map((r) => (r.id === data.id ? data : r)));
    });

    const unsubscribeCancelled = listen('EditingRequestCancelled', (data: EditingRequest) => {
      setRequests((prev) => prev.map((r) => (r.id === data.id ? data : r)));
    });

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeCancelled();
    };
  }, [isConnected, listen, activeTab, user?.id]);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('editing-view-mode', mode);
  };

  const handleAssign = (request: EditingRequest) => {
    navigate(`/editing/${request.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Top bar: view mode toggle – same layout as Edit Suite Booking */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
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
        </div>
      </div>

      {/* Filter bar – same as Edit Suite Booking */}
      <div className="bg-card rounded-lg border border-border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by program name or producer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="md:col-span-4">
            <DateRangePicker
              value={dateRange}
              onChange={(range) => {
                setDateRange(range);
                setCurrentPage(1);
              }}
              className="w-full"
            />
          </div>
        </div>
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

      {/* Filter tabs – same TabsList / TabsTrigger styling as existing segments */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          setCurrentPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="my-assignments">My assignments</TabsTrigger>
          <TabsTrigger value="Pending">Pending</TabsTrigger>
          <TabsTrigger value="Completed">Assignment Completed</TabsTrigger>
          <TabsTrigger value="Cancelled">Cancelled</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
          ) : total === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">No assignments found</p>
            </div>
          ) : (
            <EditingRequestList
              requests={requests}
              loading={loading}
              viewMode={viewMode}
              showAssignButton
              onAssign={handleAssign}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
