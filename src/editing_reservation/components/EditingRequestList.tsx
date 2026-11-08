import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EditingRequestCard } from './EditingRequestCard';
import { getEditingStatusDisplayLabel } from '../utils/editingUtils';
import type { EditingRequest } from '../types/editing';
import { formatDateTime } from '@/studio_booking/utils/timeUtils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusPill } from '@/components/ui/status-pill';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Skeleton } from '@/components/ui/skeleton';
import type { Tone } from '@/lib/tone';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'list';

const headClass = 'h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';
const GRID_CLASS =
  'min-w-[1000px] [&_th]:border-r [&_td]:border-r [&_th]:border-border/70 [&_td]:border-border/70 [&_th:last-child]:border-r-0 [&_td:last-child]:border-r-0';

const EDITING_STATUS_TONES: Record<string, Tone> = {
  Pending: 'warning',
  Acknowledged: 'info',
  Completed: 'success',
  Cancelled: 'muted',
  Rejected: 'destructive',
};

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
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table className={GRID_CLASS}>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className={cn(headClass, 'w-[80px]')}>ID</TableHead>
                <TableHead className={cn(headClass, 'w-[280px]')}>Program</TableHead>
                <TableHead className={cn(headClass, 'w-[200px]')}>Producer</TableHead>
                <TableHead className={cn(headClass, 'w-[150px]')}>Status</TableHead>
                <TableHead className={cn(headClass, 'w-[140px]')}>Created</TableHead>
                <TableHead className={cn(headClass, 'w-[200px]')}>Created by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  <TableCell className="py-3.5">
                    <Skeleton className="h-4" style={{ width: 40, maxWidth: '100%' }} />
                  </TableCell>
                  <TableCell className="py-3.5">
                    <Skeleton className="h-4" style={{ width: 200, maxWidth: '100%' }} />
                  </TableCell>
                  <TableCell className="py-3.5">
                    <Skeleton className="h-4" style={{ width: 120, maxWidth: '100%' }} />
                  </TableCell>
                  <TableCell className="py-3.5">
                    <Skeleton className="h-4" style={{ width: 90, maxWidth: '100%' }} />
                  </TableCell>
                  <TableCell className="py-3.5">
                    <Skeleton className="h-4" style={{ width: 90, maxWidth: '100%' }} />
                  </TableCell>
                  <TableCell className="py-3.5">
                    <Skeleton className="h-4" style={{ width: 120, maxWidth: '100%' }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <Table className={GRID_CLASS}>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className={cn(headClass, 'w-[80px]')}>ID</TableHead>
              <TableHead className={cn(headClass, 'w-[280px]')}>Program</TableHead>
              <TableHead className={cn(headClass, 'w-[200px]')}>Producer</TableHead>
              <TableHead className={cn(headClass, 'w-[150px]')}>Status</TableHead>
              <TableHead className={cn(headClass, 'w-[140px]')}>Created</TableHead>
              <TableHead className={cn(headClass, 'w-[200px]')}>Created by</TableHead>
              {canReject && <TableHead className={cn(headClass, 'w-[200px]')}>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => {
              const creatorName = request.createdByUser?.displayName || request.createdByUser?.username;
              return (
              <TableRow
                key={request.id}
                className="group cursor-pointer transition-colors hover:bg-muted/30"
                onClick={() => navigate(`/editing/${request.id}`)}
              >
                <TableCell className="py-3 font-mono text-xs tabular-nums text-muted-foreground">
                  {request.id}
                </TableCell>
                <TableCell className="max-w-[360px] py-3">
                  <p className="truncate font-medium text-card-foreground" title={request.programName}>
                    {request.programName}
                  </p>
                </TableCell>
                <TableCell className="py-3">
                  {request.producerName ? (
                    <div className="flex items-center gap-2">
                      <UserAvatar name={request.producerName} />
                      <span className="truncate text-sm">{request.producerName}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </TableCell>
                <TableCell className="py-3">
                  <StatusPill tone={EDITING_STATUS_TONES[request.status] ?? 'muted'}>
                    {getEditingStatusDisplayLabel(request.status)}
                  </StatusPill>
                </TableCell>
                <TableCell className="py-3 text-xs tabular-nums text-muted-foreground">
                  {formatDateTime(request.createdAt)}
                </TableCell>
                <TableCell className="py-3">
                  {creatorName ? (
                    <div className="flex items-center gap-2">
                      <UserAvatar name={creatorName} />
                      <span className="truncate text-sm">{creatorName}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </TableCell>
                {canReject && (
                  <TableCell className="py-3 text-sm" onClick={(e) => e.stopPropagation()}>
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
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                )}
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
