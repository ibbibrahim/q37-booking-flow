import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { CallSheetRequest } from '../types/callsheet';

interface TimelineEvent {
  id: number;
  title: string;
  department: string;
  startDateTime: string;
  returnDateTime: string;
  lane: 'News Studio' | 'Program Studio';
  color: string;
  status: string;
}

interface CallsheetStudioTimelineProps {
  callsheets: CallSheetRequest[];
  onOpenCallsheet: (id: number) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 6);
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export const CallsheetStudioTimeline: React.FC<CallsheetStudioTimelineProps> = ({
  callsheets,
  onOpenCallsheet,
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hoveredEvent, setHoveredEvent] = useState<TimelineEvent | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

  const events = useMemo(() => {
    const filteredCallsheets = callsheets.filter((cs) => {
      // Only show Indoor shoots
      if (cs.shootType !== 'Indoor') return false;

      // Only show News Studio or Program Studio
      if (cs.location !== 'News Studio' && cs.location !== 'Program Studio') return false;

      // Filter out items with null dates
      if (!cs.startDateTime || !cs.returnDateTime) return false;

      // Filter by selected date
      try {
        return isSameDay(new Date(cs.startDateTime), selectedDate);
      } catch {
        return false;
      }
    });

    return filteredCallsheets.map((cs, index) => ({
      id: cs.id,
      title: cs.title,
      department: cs.department,
      startDateTime: cs.startDateTime,
      returnDateTime: cs.returnDateTime,
      lane: cs.location as 'News Studio' | 'Program Studio',
      color: COLORS[index % COLORS.length],
      status: cs.status,
    })) as TimelineEvent[];
  }, [callsheets, selectedDate]);

  const newsEvents = events.filter((e) => e.lane === 'News Studio');
  const programEvents = events.filter((e) => e.lane === 'Program Studio');

  const detectOverlaps = (events: TimelineEvent[]) => {
    const eventsWithPosition = events.map(event => ({ ...event, row: 0 }));

    for (let i = 0; i < eventsWithPosition.length; i++) {
      const currentEvent = eventsWithPosition[i];
      const currentStart = new Date(currentEvent.startDateTime).getTime();
      const currentEnd = new Date(currentEvent.returnDateTime).getTime();

      let maxRow = 0;

      for (let j = 0; j < i; j++) {
        const otherEvent = eventsWithPosition[j];
        const otherStart = new Date(otherEvent.startDateTime).getTime();
        const otherEnd = new Date(otherEvent.returnDateTime).getTime();

        // Check if events overlap
        const overlaps = currentStart < otherEnd && currentEnd > otherStart;

        if (overlaps && otherEvent.row >= maxRow) {
          maxRow = otherEvent.row + 1;
        }
      }

      eventsWithPosition[i].row = maxRow;
    }

    return eventsWithPosition;
  };

  const newsEventsWithRows = detectOverlaps(newsEvents);
  const programEventsWithRows = detectOverlaps(programEvents);
  const maxNewsRows = Math.max(1, ...newsEventsWithRows.map(e => e.row + 1));
  const maxProgramRows = Math.max(1, ...programEventsWithRows.map(e => e.row + 1));

  const getEventPosition = (startDateTime: string, returnDateTime: string) => {
    const start = new Date(
      typeof startDateTime === 'string' && startDateTime.includes('-')
        ? startDateTime
        : parseInt(startDateTime)
    );
    const end = new Date(
      typeof returnDateTime === 'string' && returnDateTime.includes('-')
        ? returnDateTime
        : parseInt(returnDateTime)
    );

    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;

    const minHour = 6;
    const maxHour = 20;
    const totalHours = maxHour - minHour;

    const left = ((startHour - minHour) / totalHours) * 100;
    const width = ((endHour - startHour) / totalHours) * 100;

    return { left: `${Math.max(0, left)}%`, width: `${Math.max(0, width)}%` };
  };

  const getDuration = (startDateTime: string, returnDateTime: string) => {
    const start = new Date(
      typeof startDateTime === 'string' && startDateTime.includes('-')
        ? startDateTime
        : parseInt(startDateTime)
    );
    const end = new Date(
      typeof returnDateTime === 'string' && returnDateTime.includes('-')
        ? returnDateTime
        : parseInt(returnDateTime)
    );

    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatTime = (dateTime: string) => {
    const date = new Date(
      typeof dateTime === 'string' && dateTime.includes('-') ? dateTime : parseInt(dateTime)
    );
    return format(date, 'hh:mm a');
  };

  const handleEventHover = (event: TimelineEvent, e: React.MouseEvent) => {
    setHoveredEvent(event);
    setHoverPosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <Card className="relative">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Studio Timeline - Day View
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            View today's studio schedule from callsheets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate((prev) => addDays(prev, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-4 py-2 bg-primary/10 rounded-md text-sm font-medium text-primary">
            {format(selectedDate, 'MMM d, yyyy')}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate((prev) => addDays(prev, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-border rounded-lg">
            <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No indoor studio bookings for {format(selectedDate, 'MMM d, yyyy')}</p>
            <p className="text-xs mt-1">Only Indoor shoots with News Studio or Program Studio location are shown</p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="flex">
              {/* Fixed Left Column - Studio Labels */}
              <div className="w-[180px] flex-shrink-0 bg-muted/30">
                <div className="h-12 border-b border-border flex items-center px-4 font-semibold text-sm">
                  Studio
                </div>
                <div>
                  <div
                    className="flex flex-col justify-center px-4 border-b border-border"
                    style={{ height: `${Math.max(80, maxNewsRows * 72)}px` }}
                  >
                    <div className="font-bold text-sm">News Studio</div>
                    <div className="text-xs text-muted-foreground">{newsEvents.length} bookings</div>
                  </div>
                  <div
                    className="flex flex-col justify-center px-4"
                    style={{ height: `${Math.max(80, maxProgramRows * 72)}px` }}
                  >
                    <div className="font-bold text-sm">Program Studio</div>
                    <div className="text-xs text-muted-foreground">
                      {programEvents.length} bookings
                    </div>
                  </div>
                </div>
              </div>

            {/* Scrollable Right Container - Time Grid */}
            <div className="flex-1 overflow-x-auto">
              <div style={{ minWidth: `${HOURS.length * 100}px` }}>
                {/* Time Header Row */}
                <div className="h-12 flex border-b border-border">
                  {HOURS.map((hour, idx) => (
                    <div
                      key={hour}
                      className={`flex-1 flex items-center justify-center text-xs font-medium ${
                        idx > 0 ? 'border-l border-border' : ''
                      }`}
                      style={{ minWidth: '100px' }}
                    >
                      {hour}:00
                    </div>
                  ))}
                </div>

                {/* News Studio Lane */}
                <div
                  className="relative border-b border-border"
                  style={{ height: `${Math.max(80, maxNewsRows * 72)}px` }}
                >
                  {/* Grid Background */}
                  <div className="absolute inset-0 flex">
                    {HOURS.map((hour, idx) => (
                      <div
                        key={hour}
                        className={`flex-1 ${idx > 0 ? 'border-l border-border/50' : ''}`}
                        style={{ minWidth: '100px' }}
                      />
                    ))}
                  </div>
                  {/* Events */}
                  <div className="absolute inset-0 px-2 py-2">
                    {newsEventsWithRows.map((event) => {
                      const position = getEventPosition(event.startDateTime, event.returnDateTime);
                      const eventHeight = 64;
                      const eventGap = 8;
                      const topOffset = event.row * (eventHeight + eventGap);

                      return (
                        <div
                          key={event.id}
                          className="absolute rounded-md cursor-pointer transition-all hover:shadow-lg hover:z-10 hover:scale-[1.02] flex items-center justify-center text-white text-xs font-medium px-2"
                          style={{
                            left: position.left,
                            width: position.width,
                            top: `${topOffset}px`,
                            height: `${eventHeight}px`,
                            backgroundColor: event.color,
                          }}
                          onClick={() => onOpenCallsheet(event.id)}
                          onMouseEnter={(e) => handleEventHover(event, e)}
                          onMouseLeave={() => setHoveredEvent(null)}
                          onMouseMove={(e) => setHoverPosition({ x: e.clientX, y: e.clientY })}
                        >
                          <div className="text-center overflow-hidden">
                            <div className="font-semibold truncate">{event.title}</div>
                            <div className="text-[10px] opacity-90">
                              {formatTime(event.startDateTime)} - {formatTime(event.returnDateTime)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Program Studio Lane */}
                <div
                  className="relative"
                  style={{ height: `${Math.max(80, maxProgramRows * 72)}px` }}
                >
                  {/* Grid Background */}
                  <div className="absolute inset-0 flex">
                    {HOURS.map((hour, idx) => (
                      <div
                        key={hour}
                        className={`flex-1 ${idx > 0 ? 'border-l border-border/50' : ''}`}
                        style={{ minWidth: '100px' }}
                      />
                    ))}
                  </div>
                  {/* Events */}
                  <div className="absolute inset-0 px-2 py-2">
                    {programEventsWithRows.map((event) => {
                      const position = getEventPosition(event.startDateTime, event.returnDateTime);
                      const eventHeight = 64;
                      const eventGap = 8;
                      const topOffset = event.row * (eventHeight + eventGap);

                      return (
                        <div
                          key={event.id}
                          className="absolute rounded-md cursor-pointer transition-all hover:shadow-lg hover:z-10 hover:scale-[1.02] flex items-center justify-center text-white text-xs font-medium px-2"
                          style={{
                            left: position.left,
                            width: position.width,
                            top: `${topOffset}px`,
                            height: `${eventHeight}px`,
                            backgroundColor: event.color,
                          }}
                          onClick={() => onOpenCallsheet(event.id)}
                          onMouseEnter={(e) => handleEventHover(event, e)}
                          onMouseLeave={() => setHoveredEvent(null)}
                          onMouseMove={(e) => setHoverPosition({ x: e.clientX, y: e.clientY })}
                        >
                          <div className="text-center overflow-hidden">
                            <div className="font-semibold truncate">{event.title}</div>
                            <div className="text-[10px] opacity-90">
                              {formatTime(event.startDateTime)} - {formatTime(event.returnDateTime)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        )}

        {hoveredEvent && (
          <div
            className="fixed z-50 bg-card border border-border rounded-lg shadow-xl p-4 pointer-events-none w-64"
            style={{
              left: `${hoverPosition.x + 10}px`,
              top: `${hoverPosition.y + 10}px`,
            }}
          >
            <div className="space-y-2">
              <div className="font-semibold text-sm">{hoveredEvent.title}</div>
              <div className="text-xs text-muted-foreground">{hoveredEvent.department}</div>
              <div className="text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Studio:</span>
                  <span className="font-medium">{hoveredEvent.lane}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium">{hoveredEvent.status}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">
                    {getDuration(hoveredEvent.startDateTime, hoveredEvent.returnDateTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-muted-foreground">Start:</span>
                  <span className="font-medium">{formatTime(hoveredEvent.startDateTime)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-muted-foreground">End:</span>
                  <span className="font-medium">{formatTime(hoveredEvent.returnDateTime)}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground italic">Click to view full details</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
