import { formatDistanceToNowStrict } from 'date-fns';

import { BoardCard, BoardColumn, StatusBoard } from '@/components/ui/status-board';
import { StatusPill } from '@/components/ui/status-pill';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useBoardColumn } from '@/hooks/useBoardColumn';
import type { Tone } from '@/lib/tone';
import { formatDateTime } from '@/studio_booking/utils/timeUtils';
import { callSheetApi } from '../services/mockCallSheetApi';
import type { CallSheetRequest, CallSheetStatus } from '../types/callsheet';
import { STATUS_TONES, type CallSheetSharedFilters } from '../utils/callsheetFilters';

interface BoardColumnConfig {
  status: CallSheetStatus;
  title: string;
  tone: Tone;
}

/** Lifecycle order. Draft and Submitted are left out (Submitted isn't used in practice). */
const BOARD_COLUMNS: BoardColumnConfig[] = (
  ['With Technical Store', 'Completed', 'Cancelled'] as CallSheetStatus[]
).map((status) => ({ status, title: status, tone: STATUS_TONES[status] }));

interface CallSheetBoardProps {
  filters: CallSheetSharedFilters;
  refreshSignal?: number;
  onOpen: (callSheet: CallSheetRequest) => void;
}

export function CallSheetBoard({ filters, refreshSignal = 0, onOpen }: CallSheetBoardProps) {
  return (
    <StatusBoard>
      {BOARD_COLUMNS.map((col) => (
        <CallSheetBoardColumn
          key={col.status}
          config={col}
          filters={filters}
          refreshSignal={refreshSignal}
          onOpen={onOpen}
        />
      ))}
    </StatusBoard>
  );
}

interface CallSheetBoardColumnProps {
  config: BoardColumnConfig;
  filters: CallSheetSharedFilters;
  refreshSignal: number;
  onOpen: (callSheet: CallSheetRequest) => void;
}

function CallSheetBoardColumn({ config, filters, refreshSignal, onOpen }: CallSheetBoardColumnProps) {
  const { items, total, isLoading, isFetchingNextPage, hasMore, loadMore } = useBoardColumn<CallSheetRequest>({
    queryKey: ['callsheet', 'board', config.status, filters, refreshSignal],
    fetchPage: async (page, pageSize) => {
      const res = await callSheetApi.searchCallSheets({ ...filters, status: config.status, page, pageSize });
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
      emptyLabel="No call sheets"
      hasMore={hasMore}
      isLoadingMore={isFetchingNextPage}
      onLoadMore={loadMore}
    >
      {items.map((callSheet) => (
        <CallSheetBoardCard key={callSheet.id} callSheet={callSheet} onOpen={onOpen} />
      ))}
    </BoardColumn>
  );
}

function CallSheetBoardCard({
  callSheet,
  onOpen,
}: {
  callSheet: CallSheetRequest;
  onOpen: (callSheet: CallSheetRequest) => void;
}) {
  const creatorName = callSheet.createdByUser?.displayName || callSheet.createdByUser?.username;
  const created = callSheet.createdAt ? new Date(callSheet.createdAt) : undefined;
  const subtitle = [callSheet.department, callSheet.location].filter(Boolean).join(' · ');

  return (
    <BoardCard
      onClick={() => onOpen(callSheet)}
      title={callSheet.title}
      subtitle={subtitle || undefined}
      dimmed={callSheet.status === 'Cancelled'}
      chips={
        <>
          <StatusPill
            tone={callSheet.shootType === 'Indoor' ? 'info' : 'success'}
            ping={false}
            className="px-1.5 text-[11px]"
          >
            {callSheet.shootType}
          </StatusPill>
          {callSheet.alreadyAnnouncedEmail ? (
            <StatusPill tone="success" ping={false} className="px-1.5 text-[11px]">
              Email sent
            </StatusPill>
          ) : (
            <StatusPill tone="muted" ping={false} className="px-1.5 text-[11px]">
              Not sent
            </StatusPill>
          )}
        </>
      }
      footerKey={callSheet.id}
      footerLeft={
        callSheet.startDateTime ? (
          <span className="truncate text-[11px] text-muted-foreground" title="Call time">
            {formatDateTime(callSheet.startDateTime)}
          </span>
        ) : undefined
      }
      footerRight={
        <>
          {created && (
            <span className="text-[11px] text-muted-foreground" title={created.toLocaleString()}>
              {formatDistanceToNowStrict(created, { addSuffix: true })}
            </span>
          )}
          {creatorName && <UserAvatar name={creatorName} size="sm" tooltip />}
        </>
      }
    />
  );
}
