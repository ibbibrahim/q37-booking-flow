import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Grid3x3, List, Ban } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ListPaginationBar, getInitialPage, getInitialPageSize } from '@/components/ui/list-pagination-bar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { DateRangePicker } from '@/components/DateRangePicker';
import { EditingRequestList } from '../components/EditingRequestList';
import { ManualBlockForm } from '../components/ManualBlockForm';
import { RejectRequestDialog } from '../components/RejectRequestDialog';
import { editingApi } from '../api/editingApi';
import { useAuth } from '@/contexts/AuthContext';
import { useSignalR } from '@/contexts/SignalRContext';
import { useToast } from '@/contexts/ToastContext';
import type { EditingRequest } from '../types/editing';
import { DateRange } from 'react-day-picker';

type ViewMode = 'grid' | 'list';

const STATUS_OPTIONS = [
  { value: 'All States', label: 'All States' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Acknowledged', label: 'Acknowledged' },
  { value: 'Completed', label: 'Assignment Completed' },
  { value: 'Rejected', label: 'Cannot Accommodate' },
  { value: 'Cancelled', label: 'Cancelled' },
];
const PAGINATION_STORAGE_KEY = 'editing-workflow:requests';

export const EditingRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { listen, isConnected } = useSignalR();
  const [requests, setRequests] = useState<EditingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All States');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(() => getInitialPage(PAGINATION_STORAGE_KEY, 1));
  const [pageSize, setPageSize] = useState(() => getInitialPageSize(PAGINATION_STORAGE_KEY, 50));
  const [total, setTotal] = useState(0);
  const skipSearchPageReset = useRef(true);
  const [showManualBlockModal, setShowManualBlockModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<EditingRequest | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('editing-view-mode');
    return (saved as ViewMode) || 'list';
  });

  const canManageManualBlock =
    user?.roles?.includes('Admin') || user?.roles?.includes('SuperEditor') || false;
  const canRejectRequest = canManageManualBlock;

  const filterManualBlocks = (items: EditingRequest[]) =>
    items.filter((r) => !r.isManualBlock);

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

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const result = await editingApi.search({
        searchQuery: debouncedSearch.trim() || undefined,
        status: statusFilter !== 'All States' ? statusFilter : undefined,
        dateFrom: dateRange?.from,
        dateTo: dateRange?.to,
        page: currentPage,
        pageSize,
      });
      const items = filterManualBlocks(result.items ?? []);
      setRequests(items);
      setTotal(result.total ?? 0);
    } catch (error) {
      console.error('Failed to load edit reservations:', error);
      setRequests([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, dateRange?.from, dateRange?.to, currentPage, pageSize]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

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
      if (data.isManualBlock) return;
      setRequests((prev) => {
        const exists = prev.some((r) => r.id === data.id);
        if (exists) return prev;
        return [data, ...prev];
      });
    });

    const unsubscribeUpdated = listen('EditingRequestUpdated', (data: EditingRequest) => {
      if (data.isManualBlock) {
        setRequests((prev) => prev.filter((r) => r.id !== data.id));
        return;
      }
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
  }, [isConnected, listen]);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('editing-view-mode', mode);
  };

  const handleRejectRequest = async (reason: string) => {
    if (!rejectTarget) return;
    try {
      const updated = await editingApi.rejectRequest(rejectTarget.id, { rejectionReason: reason });
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      showToast('Request marked as cannot accommodate', 'success');
    } catch (error: unknown) {
      console.error('Failed to reject request:', error);
      const err = error as { response?: { data?: { error?: string } } };
      showToast(err.response?.data?.error || 'Failed to reject request', 'error');
      throw error;
    }
  };

  const canReject = (request: EditingRequest) =>
    canRejectRequest &&
    !request.isManualBlock &&
    (request.status === 'Pending' || request.status === 'Acknowledged');

  return (
    <div className="space-y-6">
      {/* Top bar: view mode toggle, + New Request */}
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

        <div className="flex-1" />

        {canManageManualBlock && (
          <button
            onClick={() => setShowManualBlockModal(true)}
            className="flex items-center gap-2 px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium whitespace-nowrap"
          >
            <Ban size={18} />
            Manual Block
          </button>
        )}

        <button
          onClick={() => navigate('/editing/new')}
          className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium whitespace-nowrap"
        >
          <Plus size={18} />
          New Request
        </button>
      </div>

      {/* Filter bar – styled same as Booking */}
      <div className="bg-card rounded-lg border border-border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Search */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by program name or producer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Date range */}
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

          {/* Status filter */}
          <div className="md:col-span-3">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : total === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">No edit reservations found</p>
          <button
            onClick={() => navigate('/editing/new')}
            className="mt-4 text-primary hover:text-primary/80 font-medium"
          >
            Create your first request
          </button>
        </div>
      ) : (
        <EditingRequestList
          requests={requests}
          loading={loading}
          viewMode={viewMode}
          canReject={canRejectRequest}
          onReject={(request) => setRejectTarget(request)}
          isRejectable={canReject}
        />
      )}

      <Dialog open={showManualBlockModal} onOpenChange={setShowManualBlockModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <ManualBlockForm
            mode="create"
            onSuccess={() => {
              setShowManualBlockModal(false);
              loadRequests();
            }}
            onCancel={() => setShowManualBlockModal(false)}
          />
        </DialogContent>
      </Dialog>

      <RejectRequestDialog
        open={rejectTarget !== null}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        programName={rejectTarget?.programName}
        onConfirm={handleRejectRequest}
      />
    </div>
  );
};
