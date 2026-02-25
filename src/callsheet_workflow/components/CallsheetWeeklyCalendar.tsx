import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import {
  format,
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isWithinInterval,
  isToday,
  addDays,
  setHours,
  setMinutes,
  getHours,
  differenceInMinutes,
} from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { CallSheetRequest } from '../types/callsheet';

interface CalendarEvent {
  id: number;
  title: string;
  department: string;
  startDateTime: string;
  returnDateTime: string;
  location: string | null;
  shootType: string;
  color: string;
  status: string;
}

interface CallsheetWeeklyCalendarProps {
  callsheets: CallSheetRequest[];
  onOpenCallsheet: (id: number) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

// Grid constants – every slot = 30 min
const START_HOUR = 0;   // 12 AM (midnight)
const END_HOUR = 24;    // end of day — gives 24 hour-labels: 12 AM → 11 PM
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 40; // px per 30-min slot
const HOUR_HEIGHT = SLOT_HEIGHT * 2; // px per hour
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR); // 0–23
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;
const GRID_HEIGHT = (TOTAL_MINUTES / SLOT_MINUTES) * SLOT_HEIGHT;

const parseDate = (dt: string) =>
  new Date(typeof dt === 'string' && dt.includes('-') ? dt : parseInt(dt));

export const CallsheetWeeklyCalendar: React.FC<CallsheetWeeklyCalendarProps> = ({
  callsheets,
  onOpenCallsheet,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 1 }), [weekStart]);

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    let d = new Date(weekStart);
    while (d <= weekEnd) {
      days.push(new Date(d));
      d = addDays(d, 1);
    }
    return days;
  }, [weekStart, weekEnd]);

  const events = useMemo(() => {
    const filtered = callsheets.filter((cs) => {
      if (!cs.startDateTime || !cs.returnDateTime) return false;
      try {
        return isWithinInterval(new Date(cs.startDateTime), { start: weekStart, end: weekEnd });
      } catch {
        return false;
      }
    });

    // Stable color per unique department so the same dept always gets the same color
    const deptColorMap = new Map<string, string>();
    let colorIdx = 0;
    filtered.forEach((cs) => {
      if (!deptColorMap.has(cs.department)) {
        deptColorMap.set(cs.department, COLORS[colorIdx % COLORS.length]);
        colorIdx++;
      }
    });

    return filtered.map((cs) => ({
      id: cs.id,
      title: cs.title,
      department: cs.department,
      startDateTime: cs.startDateTime,
      returnDateTime: cs.returnDateTime,
      location: cs.location,
      shootType: cs.shootType,
      color: deptColorMap.get(cs.department) ?? COLORS[0],
      status: cs.status,
    })) as CalendarEvent[];
  }, [callsheets, weekStart, weekEnd]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    weekDays.forEach((day) => {
      const key = format(day, 'yyyy-MM-dd');
      map.set(
        key,
        events
          .filter((e) => isSameDay(parseDate(e.startDateTime), day))
          .sort((a, b) => parseDate(a.startDateTime).getTime() - parseDate(b.startDateTime).getTime())
      );
    });
    return map;
  }, [events, weekDays]);

  /** Top offset + height (px) for an event block within its day column */
  const getEventBox = (startDt: string, endDt: string, day: Date) => {
    const start = parseDate(startDt);
    const end = parseDate(endDt);
    if (!isSameDay(start, day)) return null;

    const slotStart = setMinutes(setHours(new Date(day), START_HOUR), 0);
    const slotEnd = setMinutes(setHours(new Date(day), END_HOUR), 0);
    const clampedStart = start < slotStart ? slotStart : start;
    const clampedEnd = end > slotEnd ? slotEnd : end;

    const topMinutes = differenceInMinutes(clampedStart, slotStart);
    const durationMinutes = differenceInMinutes(clampedEnd, clampedStart);

    return {
      top: (topMinutes / SLOT_MINUTES) * SLOT_HEIGHT,
      height: Math.max(SLOT_HEIGHT / 2, (durationMinutes / SLOT_MINUTES) * SLOT_HEIGHT),
    };
  };

  /** Side-by-side layout for overlapping events */
  const getOverlapLayout = (dayKey: string, idx: number) => {
    const dayEvents = eventsByDay.get(dayKey) || [];
    if (dayEvents.length <= 1) return { left: 1, width: 98 };
    const w = 100 / dayEvents.length;
    return { left: idx * w + 1, width: w - 2 };
  };

  // Current time indicator
  const now = new Date();
  const todaySlotStart = setMinutes(setHours(now, START_HOUR), 0);
  const currentTimeTop =
    isWithinInterval(now, { start: weekStart, end: weekEnd }) &&
    getHours(now) >= START_HOUR &&
    getHours(now) < END_HOUR
      ? (differenceInMinutes(now, todaySlotStart) / SLOT_MINUTES) * SLOT_HEIGHT
      : null;

  const totalBookings = events.length;

  return (
    <Card className="relative overflow-hidden">
      {/* ── Accordion header ── */}
      <CardHeader
        className="cursor-pointer select-none hover:bg-muted/40 transition-colors"
        onClick={() => setIsOpen((v) => !v)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Studio Timeline — Weekly View</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isOpen
                  ? `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')} · ${totalBookings} booking${totalBookings !== 1 ? 's' : ''}`
                  : 'Click to expand studio schedule'}
              </p>
            </div>
          </div>
          <ChevronDown
            className={cn('h-5 w-5 text-muted-foreground transition-transform duration-200', isOpen && 'rotate-180')}
          />
        </div>
      </CardHeader>

      {/* ── Accordion body ── */}
      {isOpen && (
        <CardContent className="pt-0 pb-4">
          <div className="flex gap-4 mt-2">
            {/* ── LEFT SIDEBAR ── */}
            <div className="flex-shrink-0 w-[280px] min-w-[280px] overflow-x-hidden space-y-4">
              {/* Nav buttons */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
                  Today
                </Button>
                <div className="flex items-center border border-border rounded-md overflow-hidden">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none border-r border-border" onClick={() => setWeekStart((p) => subWeeks(p, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => setWeekStart((p) => addWeeks(p, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Mini calendar */}
              <div className="w-full overflow-hidden rounded-md border">
                <Calendar
                  mode="single"
                  selected={weekStart}
                  onSelect={(d) => d && setWeekStart(startOfWeek(d, { weekStartsOn: 1 }))}
                  month={weekStart}
                  onMonthChange={setWeekStart}
                  className="w-full p-2"
                  classNames={{
                    months: 'w-full',
                    month: 'w-full',
                    table: 'w-full',
                    head_row: 'flex w-full',
                    head_cell: 'flex-1 text-center text-[10px] font-medium text-muted-foreground',
                    row: 'flex w-full mt-1',
                    cell: 'flex-1 text-center',
                    day: 'w-full h-7 text-xs rounded',
                  }}
                  showOutsideDays={false}
                />
              </div>

              {/* Legend – per department */}
              {events.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Departments</p>
                  {Array.from(new Map(events.map((e) => [e.department, e.color])).entries()).map(
                    ([dept, color]) => (
                      <div key={dept} className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-sm truncate" title={dept}>{dept}</span>
                      </div>
                    )
                  )}
                  <div className="pt-1 border-t border-border space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded border border-border bg-muted shrink-0" />
                      <span className="text-xs text-muted-foreground">Indoor shoot</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded border border-border bg-muted/40 shrink-0" />
                      <span className="text-xs text-muted-foreground">Outdoor shoot</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── MAIN CALENDAR GRID ── */}
            <div className="flex-1 min-w-0 border border-border rounded-lg overflow-hidden">
              {/*
                Single scroll container: sticky day-header row + time grid share
                the SAME CSS grid columns so vertical lines are always pixel-perfect.
              */}
              <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
                <div style={{ minWidth: '560px' }}>

                  {/* ── STICKY DAY HEADERS (inside scroll so column widths match exactly) ── */}
                  <div
                    className="sticky top-0 z-20 grid border-b border-border bg-card"
                    style={{ gridTemplateColumns: `60px repeat(${weekDays.length}, 1fr)` }}
                  >
                    {/* Spacer over the time gutter */}
                    <div className="border-r border-border bg-muted/10" />

                    {weekDays.map((day) => (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          'py-2 text-center border-l border-border',
                          isToday(day) && 'bg-primary/10'
                        )}
                      >
                        <div className={cn('text-xs font-medium uppercase tracking-wide text-muted-foreground', isToday(day) && 'text-primary')}>
                          {format(day, 'EEE')}
                        </div>
                        <div className={cn('text-2xl font-light leading-tight', isToday(day) && 'text-primary font-medium')}>
                          {format(day, 'd')}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ── TIME GRID (same gridTemplateColumns → columns align perfectly) ── */}
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: `60px repeat(${weekDays.length}, 1fr)`,
                      height: GRID_HEIGHT,
                    }}
                  >
                    {/* Time gutter */}
                    <div className="relative border-r border-border bg-muted/10">
                      {HOURS.map((hour, i) => (
                        <div
                          key={hour}
                          className="absolute right-2 text-[10px] text-muted-foreground select-none"
                          style={{ top: i === 0 ? 4 : i * HOUR_HEIGHT - 7 }}
                        >
                          {format(setHours(new Date(), hour), 'h a')}
                        </div>
                      ))}
                    </div>

                    {/* Day columns */}
                    {weekDays.map((day) => {
                      const dayKey = format(day, 'yyyy-MM-dd');
                      const dayEvents = eventsByDay.get(dayKey) || [];

                      return (
                        <div
                          key={dayKey}
                          className={cn('relative border-l border-border', isToday(day) && 'bg-primary/5')}
                          style={{ height: GRID_HEIGHT }}
                        >
                          {/* Half-hour lines (faint) */}
                          <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              backgroundImage: `repeating-linear-gradient(
                                to bottom,
                                transparent 0,
                                transparent ${SLOT_HEIGHT - 1}px,
                                hsl(var(--border) / 0.4) ${SLOT_HEIGHT - 1}px,
                                hsl(var(--border) / 0.4) ${SLOT_HEIGHT}px
                              )`,
                            }}
                          />
                          {/* Full-hour lines (stronger) */}
                          <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              backgroundImage: `repeating-linear-gradient(
                                to bottom,
                                transparent 0,
                                transparent ${HOUR_HEIGHT - 1}px,
                                hsl(var(--border)) ${HOUR_HEIGHT - 1}px,
                                hsl(var(--border)) ${HOUR_HEIGHT}px
                              )`,
                            }}
                          />

                          {/* Current time indicator */}
                          {currentTimeTop !== null && isToday(day) && (
                            <div
                              className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                              style={{ top: currentTimeTop - 1 }}
                            >
                              <div className="w-2.5 h-2.5 rounded-full bg-primary -ml-1 shrink-0" />
                              <div className="flex-1 h-0.5 bg-primary" />
                            </div>
                          )}

                          {/* Events */}
                          {dayEvents.map((event, idx) => {
                            const box = getEventBox(event.startDateTime, event.returnDateTime, day);
                            if (!box) return null;
                            const layout = getOverlapLayout(dayKey, idx);
                            return (
                              <div
                                key={event.id}
                                className="absolute rounded-sm cursor-pointer overflow-hidden text-white text-xs shadow-sm hover:shadow-md hover:brightness-110 transition-all z-10"
                                style={{
                                  top: box.top + 1,
                                  height: box.height - 2,
                                  left: `${layout.left}%`,
                                  width: `${layout.width}%`,
                                  backgroundColor: event.color,
                                  opacity: event.shootType === 'Outdoor' ? 0.85 : 1,
                                  borderLeft: event.shootType === 'Outdoor' ? '3px dashed rgba(255,255,255,0.5)' : undefined,
                                }}
                                onClick={() => onOpenCallsheet(event.id)}
                                onMouseEnter={(e) => { setHoveredEvent(event); setHoverPosition({ x: e.clientX, y: e.clientY }); }}
                                onMouseLeave={() => setHoveredEvent(null)}
                                onMouseMove={(e) => setHoverPosition({ x: e.clientX, y: e.clientY })}
                              >
                                <div className="px-1.5 py-1 h-full overflow-hidden">
                                  <div className="font-semibold leading-tight truncate">{event.title}</div>
                                  {box.height >= SLOT_HEIGHT && (
                                    <div className="opacity-90 truncate mt-0.5">
                                      {format(parseDate(event.startDateTime), 'h:mm a')} – {format(parseDate(event.returnDateTime), 'h:mm a')}
                                    </div>
                                  )}
                                  {box.height >= SLOT_HEIGHT * 2 && (
                                    <div className="opacity-75 truncate text-[10px] mt-0.5">
                                      {event.shootType}{event.location ? ` · ${event.location}` : ''}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}

      {/* Hover tooltip */}
      {hoveredEvent && (
        <div
          className="fixed z-50 bg-card border border-border rounded-lg shadow-xl p-4 pointer-events-none w-64"
          style={{ left: hoverPosition.x + 14, top: hoverPosition.y + 14 }}
        >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: hoveredEvent.color }} />
                <span className="font-semibold text-sm">{hoveredEvent.title}</span>
              </div>
              <div className="text-xs text-muted-foreground">{hoveredEvent.department}</div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">{hoveredEvent.shootType}</span>
                </div>
                {hoveredEvent.location && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium">{hoveredEvent.location}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium">{hoveredEvent.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start</span>
                  <span className="font-medium">{format(parseDate(hoveredEvent.startDateTime), 'h:mm a')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">End</span>
                  <span className="font-medium">{format(parseDate(hoveredEvent.returnDateTime), 'h:mm a')}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic pt-1 border-t border-border">Click to open</p>
            </div>
        </div>
      )}
    </Card>
  );
};
