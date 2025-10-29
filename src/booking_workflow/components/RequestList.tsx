import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Grid3x3, List, Download, Calendar, ChevronLeft, ChevronRight, Edit, Trash2 } from 'lucide-react';
import { RequestCard } from './RequestCard';
import { RequestDetail } from './RequestDetail';
import type { WorkflowRequest, WorkflowStatus, UserRole } from '../types/workflow';

interface RequestListProps {
  requests: WorkflowRequest[];
  userRole: UserRole;
  onCreateNew: () => void;
  onUpdate: () => void;
}

type ViewMode = 'grid' | 'list';

const statusColors: Record<WorkflowStatus, { bg: string; text: string }> = {
  'Draft': { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300' },
  'Submitted': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  'With NOC': { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
  'Clarification Requested': { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
  'Resources Added': { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400' },
  'With Ingest': { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-400' },
  'Completed': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  'Not Done': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' }
};

const priorityColors = {
  'Normal': 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  'High': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  'Urgent': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
};

export const RequestList: React.FC<RequestListProps> = ({ requests, userRole, onCreateNew, onUpdate }) => {
  const [selectedRequest, setSelectedRequest] = useState<WorkflowRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'All'>('All');
  const [filteredRequests, setFilteredRequests] = useState<WorkflowRequest[]>(requests);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    let filtered = requests;

    if (userRole === 'NOC') {
      filtered = filtered.filter(req =>
        req.nocRequired === 'Yes' &&
        (req.status === 'Submitted' || req.status === 'With NOC' || req.status === 'Clarification Requested' || req.status === 'Resources Added')
      );
    } else if (userRole === 'Ingest') {
      filtered = filtered.filter(req => req.status === 'With Ingest');
    }

    if (searchTerm) {
      filtered = filtered.filter(req =>
        req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.program.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'All') {
      filtered = filtered.filter(req => req.status === statusFilter);
    }

    setFilteredRequests(filtered);
    setCurrentPage(1);
  }, [requests, searchTerm, statusFilter, userRole]);

  const statuses: (WorkflowStatus | 'All')[] = [
    'All',
    'Draft',
    'Submitted',
    'With NOC',
    'Clarification Requested',
    'Resources Added',
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
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
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
              onClick={() => setViewMode('list')}
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

          <button className="p-2 rounded-lg border border-border text-muted-foreground hover:text-card-foreground hover:bg-muted transition-colors">
            <Calendar size={18} />
          </button>

          <button className="p-2 rounded-lg border border-border text-muted-foreground hover:text-card-foreground hover:bg-muted transition-colors">
            <Download size={18} />
          </button>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card text-card-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

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

        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Filter size={18} className="text-muted-foreground flex-shrink-0" />
          {statuses.map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-card-foreground hover:bg-muted/80'
              }`}
            >
              {status}
            </button>
          ))}
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
              {paginatedRequests.map(request => (
                <RequestCard
                  key={request.id}
                  request={request}
                  onClick={() => setSelectedRequest(request)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground">ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground">Title</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground">Program</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground">Air Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground">State</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground">Priority</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRequests.map(request => {
                    const statusStyle = statusColors[request.status];
                    const priorityColor = priorityColors[request.priority];
                    return (
                      <tr
                        key={request.id}
                        className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedRequest(request)}
                      >
                        <td className="py-3 px-4 text-sm text-muted-foreground font-mono">{request.id}</td>
                        <td className="py-3 px-4 text-sm font-medium text-card-foreground">{request.title}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{request.program}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {new Date(request.airDateTime).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${priorityColor}`}>
                            {request.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRequest(request);
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
                  {startIndex + 1}-{Math.min(endIndex, filteredRequests.length)} of {filteredRequests.length}
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

      {selectedRequest && (
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
