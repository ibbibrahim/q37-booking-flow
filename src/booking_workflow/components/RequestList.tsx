import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Grid3x3,
  List,
  Download,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RequestCard } from './RequestCard';
import { RequestDetail } from './RequestDetail';
import type { WorkflowRequest, WorkflowStatus, UserRole } from '../types/workflow';

import { DateRange } from 'react-day-picker';
import { startOfDay, endOfDay } from 'date-fns';
import { DateRangePicker } from '@/components/DateRangePicker';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

interface RequestListProps {
  requests: WorkflowRequest[];
  userRole: UserRole;
  onCreateNew: () => void;
  onUpdate: () => void;
}

type ViewMode = 'grid' | 'list';

const statusColors: Record<WorkflowStatus, { bg: string; text: string }> = {
  Draft: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300' },
  Submitted: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  'With NOC': { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
  'Clarification Requested': {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-400'
  },
  'Resources Added': {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-700 dark:text-indigo-400'
  },
  'With Ingest': { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-400' },
  Completed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  'Not Done': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
  'Partially Completed': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' }
};

const priorityColors = {
  Normal: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  High: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  Urgent: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
};

const bookingTypeColors: Record<string, string> = {
  'Live Broadcast': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  'Incoming Feed': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  'Invite Guest for News': 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
  'Invite Guest for Program': 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
  'Download and Ingest': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  'Camera Card and Ingest': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
};

const creatorColors = [
  'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400',
  'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
  'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-400',
  'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
];

export const RequestList: React.FC<RequestListProps> = ({
  requests,
  userRole,
  onCreateNew,
  onUpdate
}) => {
  const [selectedRequest, setSelectedRequest] = useState<WorkflowRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'All'>('All');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [filteredRequests, setFilteredRequests] = useState<WorkflowRequest[]>(requests);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('booking-view-mode');
    return (saved as ViewMode) || 'list';
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const navigate = useNavigate();

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('booking-view-mode', mode);
  };

  useEffect(() => {
    let filtered = requests;

    // Role-based visibility
    if (userRole === 'NOC') {
      filtered = filtered.filter(
        (req) =>
          req.status === 'Submitted' ||
          req.status === 'With NOC' ||
          req.status === 'Clarification Requested' ||
          req.status === 'Resources Added'
      );
    } else if (userRole === 'Ingest') {
      filtered = filtered.filter((req) => req.status === 'With Ingest');
    }

    // Search filter (title, program)
    if (searchTerm) {
      const key = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (req) =>
          req.title.toLowerCase().includes(key) ||
          req.program.toLowerCase().includes(key)
        // or also ID if you want: req.id.toLowerCase().includes(key)
      );
    }

    // Status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter((req) => req.status === statusFilter);
    }

    // Date range filter on airDateTime
    if (dateRange?.from || dateRange?.to) {
      filtered = filtered.filter((req) => {
        if (!req.airDateTime) return false;
        const d = new Date(req.airDateTime);
        if (Number.isNaN(d.getTime())) return false;

        if (dateRange.from) {
          const from = startOfDay(dateRange.from);
          if (d < from) return false;
        }

        if (dateRange.to) {
          const to = endOfDay(dateRange.to);
          if (d > to) return false;
        }

        return true;
      });
    }

    setFilteredRequests(filtered);
    setCurrentPage(1);
  }, [requests, searchTerm, statusFilter, dateRange, userRole]);

  const statuses: (WorkflowStatus | 'All')[] = [
    'All',
    'Draft',
    // 'Submitted',
    'With NOC',
    'Clarification Requested',
    // 'Resources Added',
    'With Ingest',
    'Completed',
    'Not Done'
  ];

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {!selectedRequest ? (
        <>
          {/* Top bar: view mode, filter icon, export, create */}
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

            {/* <button className="p-2 rounded-lg border border-border text-muted-foreground hover:text-card-foreground hover:bg-muted transition-colors">
              <Filter size={18} />
            </button>

            <button className="p-2 rounded-lg border border-border text-muted-foreground hover:text-card-foreground hover:bg-muted transition-colors">
              <Download size={18} />
            </button> */}

            <div className="flex-1" />

            {userRole === 'Booking' && (
              <button
                onClick={onCreateNew}
                className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium whitespace-nowrap"
              >
                <Plus size={18} />
                Create
              </button>
            )}
          </div>

          {/* Filter bar – styled similar to CallSheetDashboard */}
          <div className="bg-card rounded-lg border border-border p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Search */}
              <div className="md:col-span-5 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title or program..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Date range */}
              <div className="md:col-span-4">
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  className="w-full"
                />
              </div>

              {/* Status filter */}
              <div className="md:col-span-3">
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as WorkflowStatus | 'All')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All States</SelectItem>
                    {statuses
                      .filter((s) => s !== 'All')
                      .map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">No requests found</p>
              {userRole === 'Booking' && (
                <button
                  onClick={onCreateNew}
                  className="mt-4 text-primary hover:text-primary/80 font-medium"
                >
                  Create your first request
                </button>
              )}
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedRequests.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      isNew={userRole === 'NOC' && request.__isNew}
                      onClick={() => navigate(`/${userRole.toLowerCase()}/requests/${request.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground">
                          ID
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground">
                          Title
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground">
                          Program
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground">
                          Booking Type
                        </th>
                        
                        <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground">
                          State
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground">
                          Priority
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground">
                          Created By
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground">
                          Created At
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRequests.map((request, index) => {
                        const statusStyle = statusColors[request.status];
                        const priorityColor = priorityColors[request.priority];
                        const bookingTypeColor = bookingTypeColors[request.bookingType] || 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400';
                        const creatorColor = creatorColors[index % creatorColors.length];

                        return (
                          <tr
                            key={request.id}
                            className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() =>
                              navigate(`/${userRole.toLowerCase()}/requests/${request.id}`)
                            }
                          >
                            <td className="py-3 px-4 text-sm text-muted-foreground font-mono">
                              {request.id}
                            </td>
                            <td className="py-3 px-4 text-sm font-medium text-card-foreground">
                              {request.title}
                              {request.__isNew && (
                                <span className="ml-2 text-xs font-semibold text-red-600 animate-pulse">
                                  ● New
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">
                              {request.program}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${bookingTypeColor}`}
                              >
                                {request.bookingType}
                              </span>
                            </td>
                           
                            <td className="py-3 px-4 text-sm">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                              >
                                {request.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${priorityColor}`}
                              >
                                {request.priority}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {request.createdByUser?.displayName}
                            </td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">
                              {new Date(request.createdAt).toDateString()}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/${userRole.toLowerCase()}/requests/${request.id}`);
                                  }}
                                  className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-card-foreground"
                                  title="Edit"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                  className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {filteredRequests.length > 0 && (
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Rows per page:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                      className="px-3 py-1 border border-border rounded-lg bg-card text-card-foreground text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {startIndex + 1}-{Math.min(endIndex, filteredRequests.length)} of{' '}
                      {filteredRequests.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-card-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-card-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <RequestDetail
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          userRole={userRole}
          onUpdate={() => {
            setSelectedRequest(null);
            onUpdate();
          }}
        />
      )}
    </div>
  );
};
