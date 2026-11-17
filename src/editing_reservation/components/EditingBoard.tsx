import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import { Ban } from 'lucide-react';

import { BoardCard, BoardColumn, StatusBoard } from '@/components/ui/status-board';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useBoardColumn } from '@/hooks/useBoardColumn';
import type { Tone } from '@/lib/tone';
import { editingApi } from '../api/editingApi';
import type { EditingRequest, EditingSearchRequest } from '../types/editing';
import {
  EDITING_STATUS_TONES,
  filterOutManualBlocks,
  getEditingStatusDisplayLabel,
} from '../utils/editingUtils';

interface BoardColumnConfig {
  status: string;
  title: string;
  tone: Tone;
}

/** Lifecycle order. Titles use the same display labels as the table. */
const BOARD_COLUMNS: BoardColumnConfig[] = ['Pending', 'Acknowledged', 'Completed', 'Rejected', 'Cancelled'].map(
  (status) => ({
    status,
    title: getEditingStatusDisplayLabel(status),
    tone: EDITING_STATUS_TONES[status] ?? 'muted',
  }),
);

export type EditingBoardFilters = Omit<EditingSearchRequest, 'status' | 'page' | 'pageSize'>;

interface EditingBoardProps {
  /** Search filters shared with the table (everything except status and paging). */
  filters: EditingBoardFilters;
  /** Restricts the board to these statuses (e.g. a single-status tab). */
  onlyStatuses?: string[];
  /** Bump to refetch every column (e.g. after a SignalR event or a reject). */
  refreshKey?: number;
  canReject?: boolean;
  isRejectable?: (request: EditingRequest) => boolean;
  onReject?: (request: EditingRequest) => void;
}

export function EditingBoard({
  filters,
  onlyStatuses,
  refreshKey = 0,
  canReject = false,
  isRejectable,
  onReject,
}: EditingBoardProps) {
  const navigate = useNavigate();
  const columns = useMemo(
    () => (onlyStatuses ? BOARD_COLUMNS.filter((col) => onlyStatuses.includes(col.status)) : BOARD_COLUMNS),
    [onlyStatuses],
  );

  return (
    <StatusBoard>
      {columns.map((col) => (
        <EditingBoardColumn
          key={col.status}
          config={col}
          filters={filters}
          refreshKey={refreshKey}
          canReject={canReject}
          isRejectable={isRejectable}
          onReject={onReject}
          onOpen={(request) => navigate(`/editing/${request.id}`)}
        />
      ))}
    </StatusBoard>
  );
}

interface EditingBoardColumnProps {
  config: BoardColumnConfig;
  filters: EditingBoardFilters;
  refreshKey: number;
  canReject: boolean;
  isRejectable?: (request: EditingRequest) => boolean;
  onReject?: (request: EditingRequest) => void;
  onOpen: (request: EditingRequest) => void;
}

function EditingBoardColumn({
  config,
  filters,
  refreshKey,
  canReject,
  isRejectable,
  onReject,
  onOpen,
}: EditingBoardColumnProps) {
  const { items, total, isLoading, isFetchingNextPage, hasMore, loadMore } = useBoardColumn<EditingRequest>({
    queryKey: ['editing', 'board', config.status, filters, refreshKey],
    fetchPage: async (page, pageSize) => {
      const res = await editingApi.search({ ...filters, status: config.status, page, pageSize });
      return { items: filterOutManualBlocks(res.items ?? []), total: res.total ?? 0 };
    },
  });

  return (
    <BoardColumn
      title={config.title}
      tone={config.tone}
      count={total}
      isLoading={isLoading}
      isEmpty={items.length === 0}
      emptyLabel="No requests"
      hasMore={hasMore}
      isLoadingMore={isFetchingNextPage}
      onLoadMore={loadMore}
    >
      {items.map((request) => (
        <EditingBoardCard
          key={request.id}
          request={request}
          showReject={canReject && !!isRejectable?.(request) && !!onReject}
          onReject={onReject}
          onOpen={onOpen}
        />
      ))}
    </BoardColumn>
  );
}

function EditingBoardCard({
  request,
  showReject,
  onReject,
  onOpen,
}: {
  request: EditingRequest;
  showReject: boolean;
  onReject?: (request: EditingRequest) => void;
  onOpen: (request: EditingRequest) => void;
}) {
  const creatorName = request.createdByUser?.displayName || request.createdByUser?.username;
  const created = new Date(request.createdAt);

  return (
    <BoardCard
      onClick={() => onOpen(request)}
      title={request.programName}
      subtitle={request.producerName}
      chips={
        request.approximateDuration ? (
          <StatusPill tone="muted" ping={false} className="px-1.5 text-[11px]">
            {request.approximateDuration}
          </StatusPill>
        ) : undefined
      }
      footerKey={request.id}
      footerLeft={
        showReject ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-orange-700 hover:bg-orange-50 hover:text-orange-700 dark:text-orange-400 dark:hover:bg-orange-950/30"
            title="Cannot Accommodate"
            aria-label="Cannot Accommodate"
            onClick={(e) => {
              e.stopPropagation();
              onReject?.(request);
            }}
          >
            <Ban size={14} aria-hidden />
          </Button>
        ) : undefined
      }
      footerRight={
        <>
          <span className="text-[11px] text-muted-foreground" title={created.toLocaleString()}>
            {formatDistanceToNowStrict(created, { addSuffix: true })}
          </span>
          {creatorName && <UserAvatar name={creatorName} size="sm" tooltip />}
        </>
      }
    />
  );
}
