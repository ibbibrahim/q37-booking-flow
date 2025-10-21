import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus } from 'lucide-react';
import { RequestCard } from './RequestCard';
import { RequestDetail } from './RequestDetail';
import type { WorkflowRequest, WorkflowStatus, UserRole } from '../types/workflow';

interface RequestListProps {
  requests: WorkflowRequest[];
  userRole: UserRole;
  onCreateNew: () => void;
  onUpdate: () => void;
}

export const RequestList: React.FC<RequestListProps> = ({ requests, userRole, onCreateNew, onUpdate }) => {
  const [selectedRequest, setSelectedRequest] = useState<WorkflowRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'All'>('All');
  const [filteredRequests, setFilteredRequests] = useState<WorkflowRequest[]>(requests);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex-1 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by title, program, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {userRole === 'Booking' && (
          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
          >
            <Plus size={20} />
            New Request
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter size={18} className="text-slate-500 flex-shrink-0" />
        {statuses.map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {filteredRequests.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-500 text-lg">No requests found</p>
          {userRole === 'Booking' && (
            <button
              onClick={onCreateNew}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first request
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRequests.map(request => (
            <RequestCard
              key={request.id}
              request={request}
              onClick={() => setSelectedRequest(request)}
            />
          ))}
        </div>
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
