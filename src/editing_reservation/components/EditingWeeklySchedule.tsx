import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EditingScheduleCell } from './EditingScheduleCell';
import {
  getWeekDates,
  getSundayOfWeek,
  getDayLabel,
  getWeekLabel,
  getSessionsForCell,
  getMaxRoomFromRequests,
  isReservedRoom,
  RESERVED_ROOMS,
} from '../utils/scheduleUtils';
import type { EditingRequest } from '../types/editing';

interface EditingWeeklyScheduleProps {
  requests: EditingRequest[];
  loading: boolean;
  weekStart: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onThisWeek: () => void;
}

const MIN_ROOM_COUNT = 11;

export const EditingWeeklySchedule: React.FC<EditingWeeklyScheduleProps> = ({
  requests,
  loading,
  weekStart,
  onPreviousWeek,
  onNextWeek,
  onThisWeek,
}) => {
  const completedRequests = requests.filter((r) => r.status === 'Completed');
  const weekDates = getWeekDates(getSundayOfWeek(weekStart));
  const roomCount = Math.max(MIN_ROOM_COUNT, getMaxRoomFromRequests(completedRequests));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">Edit Suite Dashboard</h1>
            <p className="text-sm text-muted-foreground">{getWeekLabel(weekDates)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPreviousWeek}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={onThisWeek}>
            This Week
          </Button>
          <Button variant="outline" size="sm" onClick={onNextWeek}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div
            className="w-4 h-4 rounded-sm border border-border"
            style={{
              backgroundImage: `repeating-linear-gradient(
                -45deg,
                #f5f5f5,
                #f5f5f5 3px,
                rgba(0,0,0,0.06) 3px,
                rgba(0,0,0,0.06) 6px
              )`,
            }}
          />
          <span>Reserved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-sm border border-border bg-[#e0f2fe] dark:bg-sky-950/40" />
          <span>Booked Session</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-sm border border-border bg-background" />
          <span>Available</span>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto border border-border rounded-lg">
        <div className="min-w-[900px]">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              Loading schedule...
            </div>
          ) : (
            <>
              {/* Header row - Room col 120px fixed, 6 day cols equal min 130px */}
              <div className="grid grid-cols-[120px_repeat(6,minmax(130px,1fr))] border-b-2 border-border bg-muted/50">
                <div className="p-2 text-sm font-semibold text-foreground">Room</div>
                {weekDates.map((d) => (
                  <div
                    key={d.toISOString()}
                    className="p-2 text-sm font-semibold text-center text-foreground border-l border-border"
                  >
                    {getDayLabel(d)}
                  </div>
                ))}
              </div>

              {/* Room rows */}
              {Array.from({ length: roomCount }, (_, i) => i + 1).map((roomNum) => {
                const isReserved = isReservedRoom(roomNum);
                const reservedFor = isReserved ? RESERVED_ROOMS[roomNum] : '';

                if (isReserved) {
                  return (
                    <div
                      key={roomNum}
                      className="flex border-b border-border last:border-b-0"
                    >
                      <div className="w-[120px] shrink-0 p-2 text-sm font-semibold text-foreground flex items-center border-r border-border">
                        Room {roomNum}
                      </div>
                      <div className="flex-1 h-[120px] flex items-center justify-center bg-[#f5f5f5] dark:bg-muted/50 relative overflow-hidden border-l border-border">
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage: `repeating-linear-gradient(
                              -45deg,
                              transparent,
                              transparent 6px,
                              rgba(0,0,0,0.04) 6px,
                              rgba(0,0,0,0.04) 12px
                            )`,
                          }}
                        />
                        <div className="relative z-10 text-center">
                          <p className="text-xs font-semibold text-muted-foreground">Reserved</p>
                          <p className="text-[10px] text-muted-foreground/70">{reservedFor}</p>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={roomNum}
                    className="grid grid-cols-[120px_repeat(6,minmax(130px,1fr))] border-b border-border last:border-b-0"
                  >
                    <div className="p-2 text-sm font-semibold text-foreground flex items-center border-r border-border bg-muted/30">
                      Room {roomNum}
                    </div>
                    {weekDates.map((date) => {
                      const sessions = getSessionsForCell(completedRequests, roomNum, date);
                      return (
                        <div key={date.toISOString()} className="border-l border-border min-w-0">
                          <EditingScheduleCell
                            sessions={sessions}
                            isReserved={false}
                            reservedFor=""
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-muted-foreground">
        Sessions are 2 hours each. Click any session block to view full details. Friday is off and
        not displayed.
      </p>
    </div>
  );
};
