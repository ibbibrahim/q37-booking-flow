import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Grid3x3, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRangePicker } from '@/components/DateRangePicker';
import { EditingRequestList } from '../components/EditingRequestList';
import { editingApi } from '../api/editingApi';
import { useSignalR } from '@/contexts/SignalRContext';
import type { EditingRequest } from '../types/editing';
import { DateRange } from 'react-day-picker';

type ViewMode = 'grid' | 'list';

const STATUS_OPTIONS = ['All States', 'Pending', 'Acknowledged', 'Completed', 'Cancelled'];

export const EditingRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { listen, isConnected } = useSignalR();
  const [requests, setRequests] = useState<EditingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All States');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('editing-view-mode');
    return (saved as ViewMode) || 'list';
  });
  const [filteredRequests, setFilteredRequests] = useState<EditingRequest[]>([]);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await editingApi.getAll();
      setRequests(data);
    } catch (error) {
      console.error('Failed to load edit reservations:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    let filtered = requests;

    if (searchTerm) {
      const key = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (req) =>
          req.programName.toLowerCase().includes(key) ||
          req.producerName.toLowerCase().includes(key) ||
          req.producerContact?.toLowerCase().includes(key)
      );
    }

    if (statusFilter !== 'All States') {
      filtered = filtered.filter((req) => req.status === statusFilter);
    }

    if (dateRange?.from || dateRange?.to) {
      filtered = filtered.filter((req) => {
        const d = new Date(req.createdAt);
        if (Number.isNaN(d.getTime())) return false;
        if (dateRange.from && d < dateRange.from) return false;
        if (dateRange.to) {
          const toEnd = new Date(dateRange.to);
          toEnd.setHours(23, 59, 59, 999);
          if (d > toEnd) return false;
        }
        return true;
      });
    }

    setFilteredRequests(filtered);
  }, [requests, searchTerm, statusFilter, dateRange]);

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribeCreated = listen('EditingRequestCreated', (data: EditingRequest) => {
      setRequests((prev) => {
        const exists = prev.some((r) => r.id === data.id);
        if (exists) return prev;
        return [data, ...prev];
      });
    });

    const unsubscribeUpdated = listen('EditingRequestUpdated', (data: EditingRequest) => {
      setRequests((prev) =>
        prev.map((r) => (r.id === data.id ? data : r))
      );
    });

    const unsubscribeCancelled = listen('EditingRequestCancelled', (data: EditingRequest) => {
      setRequests((prev) =>
        prev.map((r) => (r.id === data.id ? data : r))
      );
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
            <DateRangePicker value={dateRange} onChange={setDateRange} className="w-full" />
          </div>

          {/* Status filter */}
          <div className="md:col-span-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
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
        <EditingRequestList requests={filteredRequests} loading={loading} viewMode={viewMode} />
      )}
    </div>
  );
};
