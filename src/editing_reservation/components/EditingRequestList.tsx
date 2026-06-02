import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  canReject?: boolean;
  onReject?: (request: EditingRequest) => void;
  isRejectable?: (request: EditingRequest) => boolean;
}

export const EditingRequestList: React.FC<EditingRequestListProps> = ({
  requests,
  loading = false,
  viewMode = 'list',
  showAssignButton = false,
  onAssign,
  canReject = false,
  onReject,
  isRejectable,
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
              <th className="text-left py-3 px-4 text-sm font-semibold">Created By</th>
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
                  <div className="h-4 w-28 bg-muted animate-pulse rounded" />
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
          <div key={request.id} className="relative">
            <EditingRequestCard
              request={request}
              onClick={() => navigate(`/editing/${request.id}`)}
            />
            {canReject && isRejectable?.(request) && onReject && (
              <Button
                variant="outline"
                size="sm"
                className="absolute top-3 right-3 gap-1 text-orange-700 border-orange-300 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-700 dark:hover:bg-orange-950/30"
                onClick={(e) => {
                  e.stopPropagation();
                  onReject(request);
                }}
              >
                <Ban size={14} />
                Cannot Accommodate
              </Button>
            )}
          </div>
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
              <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                Created By
              </th>
              {canReject && (
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                  Actions
                </th>
              )}
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
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  {request.createdByUser?.displayName || request.createdByUser?.username || '—'}
                </td>
                {canReject && (
                  <td className="py-3 px-4 text-sm" onClick={(e) => e.stopPropagation()}>
                    {isRejectable?.(request) && onReject ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-orange-700 border-orange-300 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-700 dark:hover:bg-orange-950/30"
                        onClick={() => onReject(request)}
                      >
                        <Ban size={14} />
                        Cannot Accommodate
                      </Button>
                    ) : (
                      '—'
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
