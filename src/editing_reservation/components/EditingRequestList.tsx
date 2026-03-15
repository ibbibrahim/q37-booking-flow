import React from 'react';
import { useNavigate } from 'react-router-dom';
import { EditingRequestCard } from './EditingRequestCard';
import { getEditingStatusBadgeClass, getEditingStatusDisplayLabel } from '../utils/editingUtils';
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
              <th className="text-left py-3 px-4 text-sm font-semibold">Created</th>
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
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                </td>
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
                Created At
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
                    {getEditingStatusDisplayLabel(request.status)}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  {formatDateTime(request.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
