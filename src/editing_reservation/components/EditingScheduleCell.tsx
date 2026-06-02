import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { SessionWithRequest } from '../utils/scheduleUtils';
import { formatTimeRange } from '../utils/scheduleUtils';

interface EditingScheduleCellProps {
  sessions: SessionWithRequest[];
  isReserved: boolean;
  reservedFor: string;
  canManageManualBlock?: boolean;
  onManualBlockClick?: (request: SessionWithRequest['request']) => void;
}

const CELL_HEIGHT = 'h-[132px]';

export const EditingScheduleCell: React.FC<EditingScheduleCellProps> = ({
  sessions,
  isReserved,
  reservedFor,
  canManageManualBlock = false,
  onManualBlockClick,
}) => {
  const navigate = useNavigate();

  if (isReserved) {
    return (
      <div
        className={`${CELL_HEIGHT} flex items-center justify-center border border-border bg-[#f5f5f5] dark:bg-muted/50`}
        style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 6px,
            rgba(0,0,0,0.04) 6px,
            rgba(0,0,0,0.04) 12px
          )`,
        }}
      >
        <div className="text-center">
          <p className="text-[13px] text-muted-foreground font-medium">Reserved</p>
          <p className="text-xs text-muted-foreground">{reservedFor}</p>
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div
        className={`${CELL_HEIGHT} min-w-0 w-full bg-background`}
        title="Available"
      />
    );
  }

  return (
    <div
      className={`${CELL_HEIGHT} min-w-0 w-full bg-background overflow-y-auto overflow-x-hidden p-3 flex flex-col gap-2 schedule-cell-scroll`}
    >
      <TooltipProvider delayDuration={200}>
        {sessions.map(({ session, request }) => {
          const isManualBlock = request.isManualBlock === true;
          const handleClick = () => {
            if (isManualBlock && canManageManualBlock && onManualBlockClick) {
              onManualBlockClick(request);
            } else {
              navigate(`/editing/${request.id}`);
            }
          };

          return (
          <Tooltip key={session.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleClick}
                className={`w-full min-w-0 flex-shrink-0 text-left p-2 rounded-md border cursor-pointer transition-colors ${
                  isManualBlock
                    ? 'border-violet-300 dark:border-violet-700 bg-violet-100 dark:bg-violet-950/50 hover:bg-violet-200 dark:hover:bg-violet-900/50'
                    : 'border-border bg-[#e0f2fe] dark:bg-sky-950/40 hover:bg-[#bae6fd] dark:hover:bg-sky-900/50'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <p className="text-xs font-semibold text-card-foreground truncate flex-1">
                    {request.programName}
                  </p>
                  {isManualBlock && (
                    <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded bg-violet-200 dark:bg-violet-800 text-violet-800 dark:text-violet-200">
                      Manual
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5" title={session.editorName || undefined}>
                  {session.editorName || '—'}
                </p>
                <p className="text-[10px] text-muted-foreground/90 mt-0.5">
                  {session.availableDatetime
                    ? formatTimeRange(session.availableDatetime, session.sessionDurationMinutes)
                    : '—'}
                </p>
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-xs bg-card text-card-foreground shadow-lg border border-border"
            >
              <div className="space-y-1 text-sm">
                {isManualBlock && (
                  <p className="text-xs font-semibold text-violet-600 dark:text-violet-400">Manual Block</p>
                )}
                <p className="font-semibold">{request.programName}</p>
                {!isManualBlock && <p>Producer: {request.producerName}</p>}
                <p>Editor: {session.editorName || '—'}</p>
                <p>Room: {session.editRoomNumber || '—'}</p>
                <p>
                  Time:{' '}
                  {session.availableDatetime
                    ? formatTimeRange(session.availableDatetime, session.sessionDurationMinutes)
                    : '—'}
                </p>
                <p>Notes: {session.editorComments || 'No notes'}</p>
                <hr className="border-border my-2" />
                <p className="text-xs text-muted-foreground">
                  {isManualBlock && canManageManualBlock ? 'Click to edit manual block' : 'Click to view details'}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
};
