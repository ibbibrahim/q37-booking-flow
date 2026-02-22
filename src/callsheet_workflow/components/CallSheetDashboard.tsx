import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Calendar, User, Search, Filter, Grid3x3, List, Check, Mail, Minus } from 'lucide-react';
import { addDays, startOfToday, endOfToday, startOfTomorrow, endOfTomorrow, endOfDay, startOfMonth, endOfMonth, format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { callSheetApi } from '../services/mockCallSheetApi';
import { useAuth } from '@/contexts/AuthContext';
import { useSignalR } from '@/contexts/SignalRContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/DateRangePicker';
import type { CallSheetRequest } from '../types/callsheet';
import { formatQatarDateTime } from '../utils/timezone';
import { CallsheetStudioTimeline } from './CallsheetStudioTimeline';

type ViewMode = 'grid' | 'list';

export const CallSheetDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { listen, isConnected } = useSignalR();
  const [callSheets, setCallSheets] = useState<CallSheetRequest[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Debounce search query so we don't call API on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms pause

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadCallSheets = useCallback(async () => {
    // setLoading(true);
    try {
      // Build filter object
      const filters: any = {
        page: 1,
        pageSize: 1000
      };

      // Search query
      if (debouncedSearchQuery.trim()) {
        filters.searchQuery = debouncedSearchQuery.trim();
      }

      // Status filter
      if (statusFilter && statusFilter !== 'All') {
        filters.status = statusFilter;
      }

      // Driver filter
      if (driverFilter !== 'All') {
        filters.driverNeeded = driverFilter === 'Yes';
      }

      // Date range filter
      if (dateRange?.from) {
        filters.dateFrom = format(dateRange.from, 'yyyy-MM-dd')
      }
      if (dateRange?.to) {
        filters.dateTo = format(dateRange.to, 'yyyy-MM-dd')
      }

      
      // Use search API if any filters are active, otherwise use default
      const hasFilters = Object.keys(filters).length > 0;

      let data: CallSheetRequest[];
      if (hasFilters) {
        const response = await callSheetApi.searchCallSheets(filters);
        data = response.items || response;
      } else {
        data = isTechnicalStore
          ? await callSheetApi.getTechnicalStoreCallSheets()
          : await callSheetApi.getCallSheets();
      }

      setCallSheets(data);
    } catch (error) {
      console.error('Failed to load call sheets:', error);
    } finally {
      setLoading(false);
    }
  }, [isTechnicalStore, debouncedSearchQuery, statusFilter, driverFilter, dateRange]);

  useEffect(() => {
    loadCallSheets();
  }, [loadCallSheets]);

  // SignalR listeners for real-time updates
  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const unsubscribeCreated = listen('CallSheetCreated', (newCallSheet: CallSheetRequest) => {
      console.log('CallSheetCreated event received:', newCallSheet);

      if (isTechnicalStore) {
        if (newCallSheet.status === 'With Technical Store' && newCallSheet.driverNeeded) {
          setCallSheets((prev) => {
            const exists = prev.some((cs) => cs.id === newCallSheet.id);
            if (exists) return prev;
            return [newCallSheet, ...prev];
          });
        }
      } else {
        setCallSheets((prev) => {
          const exists = prev.some((cs) => cs.id === newCallSheet.id);
          if (exists) return prev;
          return [newCallSheet, ...prev];
        });
      }
    });

    const unsubscribeUpdatedByTechnicalStore = listen('CallSheetUpdatedByTechnicalStore', (updatedCallSheet: CallSheetRequest) => {
      console.log('CallSheetUpdatedByTechnicalStore event received:', updatedCallSheet);

      setCallSheets((prev) => {
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
      });
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

  // if (loading) {
  //   return (
  //     <div className="flex items-center justify-center py-16">
  //       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  //     </div>
  //   );
  // }

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
              onChange={setDateRange}
              className="w-full"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
            <Select value={driverFilter} onValueChange={setDriverFilter}>
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

      {/* Studio Timeline */}
      <CallsheetStudioTimeline
        callsheets={callSheets}
        onOpenCallsheet={(id) => navigate(`/callsheet/${id}`)}
      />

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {callSheets.length} call sheet{callSheets.length !== 1 ? 's' : ''}
      </div>

      {callSheets.length === 0 ? (
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
                  <span>{callSheet.createdBy}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {callSheet.crewAssignments.length > 0 && (
                    <span>{callSheet.crewAssignments.length} crew</span>
                  )}
                  {callSheet.equipment.length > 0 && (
                    <span>{callSheet.equipment.length} equipment</span>
                  )}
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
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                  ID
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                  Title
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                  Department
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                  Location
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                  Shoot Type
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                  Announcement
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                  Start Date/Time
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                  Crew
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                  Equipment
                </th>
              </tr>
            </thead>
            <tbody>
              {callSheets.map((callSheet) => {
                const isCancelled = callSheet.status === 'Cancelled';
                return (
                  <tr
                    key={callSheet.id}
                    className={`border-b border-border hover:bg-muted/50 cursor-pointer transition-colors ${
                      isCancelled ? 'opacity-60' : ''
                    }`}
                    onClick={() => navigate(`/callsheet/${callSheet.id}`)}
                  >
                    <td className="py-3 px-4 text-sm text-muted-foreground font-mono">
                      {callSheet.id}
                    </td>
                    <td className={`py-3 px-4 text-sm font-medium text-card-foreground ${
                      isCancelled ? 'line-through' : ''
                    }`}>
                      {callSheet.title}
                    </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {callSheet.department}
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {callSheet.location || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      callSheet.shootType === 'Indoor'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    }`}>
                      {callSheet.shootType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[callSheet.status]}`}>
                      {callSheet.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {callSheet.alreadyAnnouncedEmail ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                        <Check className="h-3 w-3" />
                        Email Sent
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        <Minus className="h-3 w-3" />
                        Not Sent
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {callSheet.startDateTime ? formatQatarDateTime(callSheet.startDateTime) : '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {callSheet.crewAssignments.length}
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {callSheet.equipment.length}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
};
