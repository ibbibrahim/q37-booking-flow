import { formatDistanceToNowStrict } from 'date-fns';

import { BoardCard, BoardColumn, BoardPriorityIcon, StatusBoard } from '@/components/ui/status-board';
import { StatusPill } from '@/components/ui/status-pill';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useBoardColumn } from '@/hooks/useBoardColumn';
import type { Tone } from '@/lib/tone';
import { listCreativeRequests } from '../services/creativeApi';
import {
  CREATIVE_REQUEST_STATUS,
  CREATIVE_REQUEST_TYPE_LABEL,
  type CreativeRequestListItem,
} from '../types/creative';
import { STATUS_TONES, type CreativeSharedFilters } from '../utils/creativeList';

interface BoardColumnConfig {
  id: string;
  title: string;
  status: string;
  tone: Tone;
}

/** Lifecycle order: Submitted -> (NeedsRevision <-> Submitted) -> Completed -> Approved (terminal). */
const BOARD_COLUMNS: BoardColumnConfig[] = [
  { id: 'submitted', title: 'Submitted', status: CREATIVE_REQUEST_STATUS.Submitted, tone: STATUS_TONES.Submitted },
  {
    id: 'needs-revision',
    title: 'Needs Revision',
    status: CREATIVE_REQUEST_STATUS.NeedsRevision,
    tone: STATUS_TONES.NeedsRevision,
  },
  { id: 'completed', title: 'Completed', status: CREATIVE_REQUEST_STATUS.Completed, tone: STATUS_TONES.Completed },
  { id: 'approved', title: 'Approved', status: CREATIVE_REQUEST_STATUS.Approved, tone: STATUS_TONES.Approved },
];

const PRIORITY_LEVEL: Record<string, 'urgent' | 'normal'> = {
  Urgent: 'urgent',
  Normal: 'normal',
};

interface CreativeBoardProps {
  filters: CreativeSharedFilters;
  onOpen: (request: CreativeRequestListItem) => void;
}

export function CreativeBoard({ filters, onOpen }: CreativeBoardProps) {
  return (
    <StatusBoard>
      {BOARD_COLUMNS.map((col) => (
        <CreativeBoardColumn key={col.id} config={col} filters={filters} onOpen={onOpen} />
      ))}
    </StatusBoard>
  );
}

interface CreativeBoardColumnProps {
  config: BoardColumnConfig;
  filters: CreativeSharedFilters;
  onOpen: (request: CreativeRequestListItem) => void;
}

function CreativeBoardColumn({ config, filters, onOpen }: CreativeBoardColumnProps) {
  const { items, total, isLoading, isFetchingNextPage, hasMore, loadMore } = useBoardColumn<CreativeRequestListItem>({
    queryKey: ['creative', 'board', config.id, filters],
    fetchPage: async (page, pageSize) => {
      const res = await listCreativeRequests({ ...filters, status: config.status, page, perPage: pageSize });
      return { items: res.items ?? [], total: res.totalItems ?? 0 };
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
        <CreativeBoardCard key={request.id} request={request} onOpen={onOpen} />
      ))}
    </BoardColumn>
  );
}

function CreativeBoardCard({
  request,
  onOpen,
}: {
  request: CreativeRequestListItem;
  onOpen: (request: CreativeRequestListItem) => void;
}) {
  const created = new Date(request.createdAt);

  return (
    <BoardCard
      onClick={() => onOpen(request)}
      title={request.title}
      subtitle={request.program ?? undefined}
      chips={
        <StatusPill tone="muted" className="px-1.5 text-[11px]">
          {CREATIVE_REQUEST_TYPE_LABEL[request.requestType] ?? request.requestType}
        </StatusPill>
      }
      footerKey={request.id}
      footerLeft={<BoardPriorityIcon level={PRIORITY_LEVEL[request.priority] ?? 'normal'} />}
      footerRight={
        <>
          <span className="text-[11px] text-muted-foreground" title={created.toLocaleString()}>
            {formatDistanceToNowStrict(created, { addSuffix: true })}
          </span>
          {request.createdByName && <UserAvatar name={request.createdByName} size="sm" tooltip />}
        </>
      }
    />
  );
}
