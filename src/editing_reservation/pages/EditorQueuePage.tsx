import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Grid3x3, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateRangePicker } from '@/components/DateRangePicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditingRequestList } from '../components/EditingRequestList';
import { editingApi } from '../api/editingApi';
import { useSignalR } from '@/contexts/SignalRContext';
import type { EditingRequest } from '../types/editing';
import { DateRange } from 'react-day-picker';

type ViewMode = 'grid' | 'list';

const PAGE_SIZE = 50;
// Statuses shown in "All" tab (Acknowledged kept in logic, removed from UI tabs only)
const ALL_TAB_STATUSES = ['Pending', 'Acknowledged', 'Completed'];

export const EditorQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const { listen, isConnected } = useSignalR();
  const [requests, setRequests] = useState<EditingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('editing-view-mode');
    return (saved as ViewMode) || 'list';
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const statusFilter = activeTab === 'all' ? undefined : activeTab;
      const result = await editingApi.search({
        searchQuery: debouncedSearch.trim() || undefined,
        status: statusFilter,
        dateFrom: dateRange?.from,
        dateTo: dateRange?.to,
        page: currentPage,
        pageSize: PAGE_SIZE,
      });
      const items = result.items ?? [];
      const filtered =
        activeTab === 'all'
          ? items.filter((r) => ALL_TAB_STATUSES.includes(r.status))
          : items;
      setRequests(filtered);
      setTotalCount(result.total ?? filtered.length);
    } catch (error) {
      console.error('Failed to load edit suite assignments:', error);
      setRequests([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedSearch, dateRange?.from, dateRange?.to, currentPage]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribeCreated = listen('EditingRequestCreated', (data: EditingRequest) => {
      setRequests((prev) => {
        const exists = prev.some((r) => r.id === data.id);
        if (exists) return prev;
        if (!ALL_TAB_STATUSES.includes(data.status)) return prev;
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
  }, [isConnected, listen]);

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

      {/* Filter tabs – All, Pending, Assignment Completed (Acknowledged removed from UI only) */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          setCurrentPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="Pending">Pending</TabsTrigger>
          <TabsTrigger value="Completed">Assignment Completed</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-6">
          {requests.length === 0 && !loading ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">No assignments found</p>
            </div>
          ) : (
            <>
              <EditingRequestList
                requests={requests}
                loading={loading}
                viewMode={viewMode}
                showAssignButton
                onAssign={handleAssign}
              />
              {totalCount > PAGE_SIZE && (
                <div className="flex items-center justify-between text-sm text-muted-foreground pt-4">
                  <span>
                    Showing {requests.length} of {totalCount} result{totalCount !== 1 ? 's' : ''}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1 || loading}
                    >
                      Previous
                    </Button>
                    <span>
                      Page {currentPage} of {Math.ceil(totalCount / PAGE_SIZE)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => p + 1)}
                      disabled={currentPage >= Math.ceil(totalCount / PAGE_SIZE) || loading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
