import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit } from 'lucide-react';
import { EditingRequestCard } from './EditingRequestCard';
import { getEditingStatusBadgeClass } from '../utils/editingUtils';
import type { EditingRequest } from '../types/editing';
import { formatDateTime } from '@/studio_booking/utils/timeUtils';

type ViewMode = 'grid' | 'list';

interface EditingRequestListProps {
  requests: EditingRequest[];
  loading?: boolean;
  viewMode?: ViewMode;
  showAssignButton?: boolean;
  onAssign?: (request: EditingRequest) => void;
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getSessionProgress = (request: EditingRequest): string => {
  const sessions = request.editingSessions ?? [];
  const total = request.sessionsPerWeek ?? 1;
  const assigned = sessions.filter((s) => s.availableDatetime).length;
  if (request.editorAssigned && request.availableDatetime && assigned === 0) {
    return total === 1 ? '✅ 1/1' : `✅ 1/${total}`;
  }
  if (assigned === 0) return `0/${total}`;
  if (assigned === total) return `✅ ${assigned}/${total}`;
  return `📝 ${assigned}/${total}`;
};

export const EditingRequestList: React.FC<EditingRequestListProps> = ({
  requests,
  loading = false,
  viewMode = 'list',
  showAssignButton = false,
  onAssign,
}) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left py-3 px-4 text-sm font-semibold">ID</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Program</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Producer</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Status</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Sessions</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Created</th>
              {showAssignButton && <th className="text-left py-3 px-4 text-sm font-semibold">Action</th>}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="border-b border-border">
                <td className="py-3 px-4">
                  <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                </td>
                <td className="py-3 px-4">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                </td>
                <td className="py-3 px-4">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                </td>
                <td className="py-3 px-4">
                  <div className="h-5 w-20 bg-muted animate-pulse rounded" />
                </td>
                <td className="py-3 px-4">
                  <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                </td>
                <td className="py-3 px-4">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                </td>
                {showAssignButton && (
                  <td className="py-3 px-4">
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-lg border border-border p-12 text-center">
        <p className="text-muted-foreground">No edit reservations found</p>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {requests.map((request) => (
          <EditingRequestCard
            key={request.id}
            request={request}
            onClick={() => navigate(`/editing/${request.id}`)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                ID
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                Program
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                Producer
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                Status
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                Sessions
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                Created At
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr
                key={request.id}
                className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/editing/${request.id}`)}
              >
                <td className="py-3 px-4 text-sm text-muted-foreground font-mono">{request.id}</td>
                <td className="py-3 px-4 text-sm font-medium text-card-foreground">
                  {request.programName}
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">{request.producerName}</td>
                <td className="py-3 px-4 text-sm">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getEditingStatusBadgeClass(
                      request.status
                    )}`}
                  >
                    {request.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  {getSessionProgress(request)}
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  {formatDateTime(request.createdAt)}
                </td>
                <td className="py-3 px-4 text-sm" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    {showAssignButton && onAssign && ['Pending', 'Acknowledged'].includes(request.status) && (
                      <button
                        type="button"
                        onClick={() => onAssign(request)}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Assign
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate(`/editing/${request.id}/edit`, { state: { editData: request } })}
                      className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-card-foreground transition-colors"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
