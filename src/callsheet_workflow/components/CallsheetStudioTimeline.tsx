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
  lane: 'Studio News' | 'Studio Program';
  color: string;
}

interface CallsheetStudioTimelineProps {
  callsheets: CallSheetRequest[];
  onOpenCallsheet: (id: number) => void;
}

const DUMMY_EVENTS: TimelineEvent[] = [
  {
    id: 9001,
    title: 'Morning News Broadcast',
    department: 'News and Digital Media',
    startDateTime: new Date().setHours(8, 0, 0, 0).toString(),
    returnDateTime: new Date().setHours(10, 0, 0, 0).toString(),
    lane: 'Studio News',
    color: '#10b981',
  },
  {
    id: 9002,
    title: 'Tests',
    department: 'News and Digital Media',
    startDateTime: new Date().setHours(11, 0, 0, 0).toString(),
    returnDateTime: new Date().setHours(12, 0, 0, 0).toString(),
    lane: 'Studio News',
    color: '#10b981',
  },
  {
    id: 9003,
    title: 'Evening Bulletin',
    department: 'News and Digital Media',
    startDateTime: new Date().setHours(16, 0, 0, 0).toString(),
    returnDateTime: new Date().setHours(18, 0, 0, 0).toString(),
    lane: 'Studio News',
    color: '#f97316',
  },
  {
    id: 9004,
    title: 'Business Weekly',
    department: 'QBusiness',
    startDateTime: new Date().setHours(9, 0, 0, 0).toString(),
    returnDateTime: new Date().setHours(11, 30, 0, 0).toString(),
    lane: 'Studio Program',
    color: '#3b82f6',
  },
  {
    id: 9005,
    title: 'Talk Show Recording',
    department: 'QTV37 Production',
    startDateTime: new Date().setHours(13, 0, 0, 0).toString(),
    returnDateTime: new Date().setHours(15, 30, 0, 0).toString(),
    lane: 'Studio Program',
    color: '#8b5cf6',
  },
  {
    id: 9006,
    title: 'Special Interview',
    department: 'News and Digital Media',
    startDateTime: new Date().setHours(14, 0, 0, 0).toString(),
    returnDateTime: new Date().setHours(15, 0, 0, 0).toString(),
    lane: 'Studio News',
    color: '#ef4444',
  },
];

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
    const filteredCallsheets = callsheets.filter(
      (cs) =>
        cs.shootType === 'Indoor' &&
        (cs.indoorFacility === 'News Studio' || cs.indoorFacility === 'Program Studio') &&
        isSameDay(new Date(cs.startDateTime), selectedDate)
    );

    if (filteredCallsheets.length === 0) {
      return DUMMY_EVENTS.filter((event) =>
        isSameDay(new Date(parseInt(event.startDateTime)), selectedDate)
      );
    }

    return filteredCallsheets.map((cs, index) => ({
      id: cs.id,
      title: cs.title,
      department: cs.department,
      startDateTime: cs.startDateTime,
      returnDateTime: cs.returnDateTime,
      lane: cs.indoorFacility === 'News Studio' ? 'Studio News' : 'Studio Program',
      color: COLORS[index % COLORS.length],
    })) as TimelineEvent[];
  }, [callsheets, selectedDate]);

  const newsEvents = events.filter((e) => e.lane === 'Studio News');
  const programEvents = events.filter((e) => e.lane === 'Studio Program');

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
        <div className="relative overflow-x-auto">
          <div className="min-w-[1000px]">
            <div className="grid grid-cols-[150px_1fr] border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/30">
                <div className="h-12 border-b border-border flex items-center px-4 font-semibold text-sm">
                  Studio
                </div>
                <div className="border-b border-border">
                  <div className="h-20 flex flex-col justify-center px-4 border-b border-border">
                    <div className="font-medium text-sm">Studio News</div>
                    <div className="text-xs text-muted-foreground">{newsEvents.length} bookings</div>
                  </div>
                  <div className="h-20 flex flex-col justify-center px-4">
                    <div className="font-medium text-sm">Studio Program</div>
                    <div className="text-xs text-muted-foreground">
                      {programEvents.length} bookings
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="h-12 grid grid-cols-14 border-b border-border">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="flex items-center justify-center text-xs font-medium border-l border-border first:border-l-0"
                    >
                      {hour}:00
                    </div>
                  ))}
                </div>

                <div className="relative border-b border-border">
                  <div className="h-20 relative border-b border-border">
                    <div className="absolute inset-0 grid grid-cols-14">
                      {HOURS.map((hour) => (
                        <div
                          key={hour}
                          className="border-l border-border/50 first:border-l-0"
                        />
                      ))}
                    </div>
                    <div className="absolute inset-0 px-2 py-2">
                      {newsEvents.map((event) => {
                        const position = getEventPosition(event.startDateTime, event.returnDateTime);
                        return (
                          <div
                            key={event.id}
                            className="absolute h-16 rounded-md cursor-pointer transition-all hover:shadow-lg hover:z-10 hover:scale-[1.02] flex items-center justify-center text-white text-xs font-medium px-2"
                            style={{
                              left: position.left,
                              width: position.width,
                              backgroundColor: event.color,
                            }}
                            onClick={() => onOpenCallsheet(event.id)}
                            onMouseEnter={(e) => handleEventHover(event, e)}
                            onMouseLeave={() => setHoveredEvent(null)}
                            onMouseMove={(e) => setHoverPosition({ x: e.clientX, y: e.clientY })}
                          >
                            <div className="text-center">
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

                  <div className="h-20 relative">
                    <div className="absolute inset-0 grid grid-cols-14">
                      {HOURS.map((hour) => (
                        <div
                          key={hour}
                          className="border-l border-border/50 first:border-l-0"
                        />
                      ))}
                    </div>
                    <div className="absolute inset-0 px-2 py-2">
                      {programEvents.map((event) => {
                        const position = getEventPosition(event.startDateTime, event.returnDateTime);
                        return (
                          <div
                            key={event.id}
                            className="absolute h-16 rounded-md cursor-pointer transition-all hover:shadow-lg hover:z-10 hover:scale-[1.02] flex items-center justify-center text-white text-xs font-medium px-2"
                            style={{
                              left: position.left,
                              width: position.width,
                              backgroundColor: event.color,
                            }}
                            onClick={() => onOpenCallsheet(event.id)}
                            onMouseEnter={(e) => handleEventHover(event, e)}
                            onMouseLeave={() => setHoveredEvent(null)}
                            onMouseMove={(e) => setHoverPosition({ x: e.clientX, y: e.clientY })}
                          >
                            <div className="text-center">
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
        </div>

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
