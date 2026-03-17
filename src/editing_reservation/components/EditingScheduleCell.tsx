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
}

const CELL_HEIGHT = 'h-[120px]';

export const EditingScheduleCell: React.FC<EditingScheduleCellProps> = ({
  sessions,
  isReserved,
  reservedFor,
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
        {sessions.map(({ session, request }) => (
          <Tooltip key={session.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => navigate(`/editing/${request.id}`)}
                className="w-full min-w-0 flex-shrink-0 text-left p-2 rounded-md border border-border bg-[#e0f2fe] dark:bg-sky-950/40 hover:bg-[#bae6fd] dark:hover:bg-sky-900/50 cursor-pointer transition-colors"
              >
                <p className="text-xs font-semibold text-card-foreground truncate">
                  {request.programName}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
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
                <p className="font-semibold">{request.programName}</p>
                <p>Producer: {request.producerName}</p>
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
                <p className="text-xs text-muted-foreground">Click to view details</p>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
};
