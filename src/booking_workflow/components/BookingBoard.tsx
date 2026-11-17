import { useMemo } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';

import { BoardCard, BoardColumn, BoardPriorityIcon, StatusBoard } from '@/components/ui/status-board';
import { StatusPill } from '@/components/ui/status-pill';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useBoardColumn } from '@/hooks/useBoardColumn';
import type { Tone } from '@/lib/tone';
import { mockApi } from '../services/bookingApi';
import type { Priority, UserRole, WorkflowRequest, WorkflowStatus } from '../types/workflow';
import { BookingTypePill } from '../utils/bookingDisplay';
import { ROLE_VISIBLE_STATUSES, type BookingSharedFilters } from '../utils/bookingFilters';

interface BoardColumnConfig {
  id: string;
  title: string;
  statuses: WorkflowStatus[];
  tone: Tone;
}

/** Lifecycle order. */
const BOARD_COLUMNS: BoardColumnConfig[] = [
  { id: 'with-noc', title: 'With NOC', statuses: ['With NOC'], tone: 'warning' },
  { id: 'clarification', title: 'Clarification Requested', statuses: ['Clarification Requested'], tone: 'warning' },
  { id: 'with-ingest', title: 'With Ingest', statuses: ['With Ingest'], tone: 'primary' },
  { id: 'completed', title: 'Completed', statuses: ['Completed', 'Partially Completed'], tone: 'success' },
  { id: 'not-done', title: 'Not Done', statuses: ['Not Done'], tone: 'destructive' },
];

const PRIORITY_LEVEL: Record<Priority, 'urgent' | 'high' | 'normal'> = {
  Urgent: 'urgent',
  High: 'high',
  Normal: 'normal',
};

interface BookingBoardProps {
  userRole: UserRole;
  filters: BookingSharedFilters;
  refreshSignal?: number;
  onOpen: (request: WorkflowRequest) => void;
}

export function BookingBoard({ userRole, filters, refreshSignal = 0, onOpen }: BookingBoardProps) {
  const columns = useMemo(() => {
    const allowed = ROLE_VISIBLE_STATUSES[userRole];
    return BOARD_COLUMNS.map((col) => ({
      ...col,
      statuses: allowed ? col.statuses.filter((s) => allowed.includes(s)) : col.statuses,
    })).filter((col) => col.statuses.length > 0);
  }, [userRole]);

  return (
    <StatusBoard>
      {columns.map((col) => (
        <BookingBoardColumn
          key={col.id}
          config={col}
          userRole={userRole}
          filters={filters}
          refreshSignal={refreshSignal}
          onOpen={onOpen}
        />
      ))}
    </StatusBoard>
  );
}

interface BookingBoardColumnProps {
  config: BoardColumnConfig;
  userRole: UserRole;
  filters: BookingSharedFilters;
  refreshSignal: number;
  onOpen: (request: WorkflowRequest) => void;
}

function BookingBoardColumn({ config, userRole, filters, refreshSignal, onOpen }: BookingBoardColumnProps) {
  const { items, total, isLoading, isFetchingNextPage, hasMore, loadMore } = useBoardColumn<WorkflowRequest>({
    queryKey: ['booking', 'board', config.id, filters, userRole, refreshSignal],
    fetchPage: async (page, pageSize) => {
      const res = await mockApi.searchBookingRequests(
        { ...filters, statuses: config.statuses, page, pageSize },
        userRole,
      );
      return { items: res.items ?? [], total: res.total ?? 0 };
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
        <BookingBoardCard key={request.id} request={request} userRole={userRole} onOpen={onOpen} />
      ))}
    </BoardColumn>
  );
}

function BookingBoardCard({
  request,
  userRole,
  onOpen,
}: {
  request: WorkflowRequest;
  userRole: UserRole;
  onOpen: (request: WorkflowRequest) => void;
}) {
  const creatorName = request.createdByUser?.displayName ?? request.createdBy;
  const created = new Date(request.createdAt);
  const isNew = userRole === 'NOC' && request.__isNew;

  return (
    <BoardCard
      onClick={() => onOpen(request)}
      title={request.title}
      subtitle={request.program}
      highlight={isNew}
      badge={
        isNew ? (
          <StatusPill tone="primary" ping className="px-1.5 text-[11px]">
            NEW
          </StatusPill>
        ) : undefined
      }
      chips={
        <>
          <BookingTypePill type={request.bookingType} />
          {request.nocAcknowledged === true && (
            <StatusPill tone="success" className="px-1.5 text-[11px]">
              NOC
            </StatusPill>
          )}
          {request.ingestAcknowledged === true && (
            <StatusPill tone="success" className="px-1.5 text-[11px]">
              Ingest
            </StatusPill>
          )}
        </>
      }
      footerKey={request.id}
      footerLeft={<BoardPriorityIcon level={PRIORITY_LEVEL[request.priority] ?? 'normal'} />}
      footerRight={
        <>
          <span className="text-[11px] text-muted-foreground" title={created.toLocaleString()}>
            {formatDistanceToNowStrict(created, { addSuffix: true })}
          </span>
          <UserAvatar name={creatorName} size="sm" tooltip />
        </>
      }
    />
  );
}
