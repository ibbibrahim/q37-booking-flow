import React, { useRef, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { format, parseISO, isToday, startOfWeek, addDays, getWeek } from 'date-fns';
import { RefreshCw, CalendarX } from 'lucide-react';
import {
  WEEK_STARTS_ON,
  WEEKLY_PX_PER_MIN,
  WEEKLY_SLOT_MINUTES,
  WEEKLY_GRID_HEIGHT,
  WEEKLY_GMT_COL_WIDTH,
  WEEKLY_DOH_COL_WIDTH,
  WEEKLY_DAY_MIN_WIDTH,
  WEEKLY_TIME_HEADER_HEIGHT,
  QATAR_UTC_OFFSET_HOURS,
  type Programme,
} from '../types/epg.types';
import { WeeklyProgrammeBlock } from './WeeklyProgrammeBlock';
import { useNowLine } from '../hooks/useNowLine';

interface WeeklyViewProps {
  currentDate: string;
  weekData: Map<string, Programme[]>;
  isLoading: boolean;
  error: string | null;
  onCardClick: (p: Programme) => void;
  onDayClick: (date: string) => void;
  onRetry: () => void;
}

const TIME_SLOTS = Array.from({ length: (24 * 60) / WEEKLY_SLOT_MINUTES }, (_, i) => i * WEEKLY_SLOT_MINUTES);

function formatSlotTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

function gmtFromDoha(dohaMinutes: number): number {
  return (dohaMinutes - QATAR_UTC_OFFSET_HOURS * 60 + 24 * 60) % (24 * 60);
}

function WeeklyGridSkeleton() {
  const placeholders = [
    { day: 0, start: 0, dur: 30 },
    { day: 0, start: 90, dur: 45 },
    { day: 1, start: 510, dur: 150 },
    { day: 2, start: 510, dur: 150 },
    { day: 3, start: 660, dur: 30 },
    { day: 4, start: 720, dur: 60 },
    { day: 5, start: 1080, dur: 90 },
    { day: 6, start: 1200, dur: 45 },
  ];

  return (
    <>
      {TIME_SLOTS.map(slot => (
        <div
          key={`grid-${slot}`}
          className="absolute left-0 right-0 border-b border-border/40"
          style={{ top: slot * WEEKLY_PX_PER_MIN, height: WEEKLY_SLOT_MINUTES * WEEKLY_PX_PER_MIN }}
        />
      ))}
      {Array.from({ length: 7 }, (_, dayIdx) => (
        <div
          key={`day-${dayIdx}`}
          className="relative flex-1 min-w-0 border-r border-border last:border-r-0"
          style={{ minWidth: WEEKLY_DAY_MIN_WIDTH, height: WEEKLY_GRID_HEIGHT }}
        >
          {placeholders
            .filter(p => p.day === dayIdx)
            .map((p, i) => (
              <div
                key={i}
                className="absolute left-0.5 right-0.5 rounded-sm bg-muted/50 animate-pulse"
                style={{
                  top: p.start * WEEKLY_PX_PER_MIN + 1,
                  height: p.dur * WEEKLY_PX_PER_MIN - 2,
                }}
              />
            ))}
        </div>
      ))}
    </>
  );
}

export const WeeklyView: React.FC<WeeklyViewProps> = ({
  currentDate,
  weekData,
  isLoading,
  error,
  onCardClick,
  onDayClick,
  onRetry,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { nowMinute } = useNowLine();

  const base = parseISO(currentDate);
  const weekStart = startOfWeek(base, { weekStartsOn: WEEK_STARTS_ON });
  const weekEnd = addDays(weekStart, 6);
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd')),
    [weekStart],
  );

  const weekNumber = getWeek(weekStart, { weekStartsOn: WEEK_STARTS_ON });
  const todayInWeek = weekDates.some(d => isToday(parseISO(d)));

  useEffect(() => {
    if (!scrollRef.current || isLoading) return;
    const el = scrollRef.current;
    const targetTop = todayInWeek
      ? Math.max(0, nowMinute * WEEKLY_PX_PER_MIN - el.clientHeight / 3)
      : 6 * 60 * WEEKLY_PX_PER_MIN - el.clientHeight / 4;
    el.scrollTo({ top: targetTop, behavior: 'smooth' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, currentDate, todayInWeek]);

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <CalendarX size={24} className="text-destructive" />
        </div>
        <div>
          <p className="font-semibold text-card-foreground">Failed to load weekly schedule</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    );
  }

  const timeColsWidth = WEEKLY_GMT_COL_WIDTH + WEEKLY_DOH_COL_WIDTH;
  const gridMinWidth = timeColsWidth + 7 * WEEKLY_DAY_MIN_WIDTH;

  return (
    <motion.div
      key="weekly"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full rounded-xl border border-border bg-card shadow-sm overflow-hidden"
    >
      {/* Week plan header — matches Excel title row */}
      <div className="px-5 py-3 border-b border-border bg-muted/20">
        <p className="text-sm font-bold text-card-foreground tracking-tight">
          QBC weekly plan — {format(weekStart, 'dd/MM/yyyy')} to {format(weekEnd, 'dd/MM/yyyy')}
          <span className="text-muted-foreground font-semibold ml-2">(WEEK {weekNumber})</span>
        </p>
      </div>

      <div
        ref={scrollRef}
        className="overflow-y-auto overflow-x-auto max-h-[min(72vh,960px)] w-full"
      >
        <div className="w-full" style={{ minWidth: gridMinWidth }}>
          {/* Sticky column headers */}
          <div
            className="sticky top-0 z-30 flex w-full border-b border-border bg-muted/60 backdrop-blur-sm"
            style={{ height: WEEKLY_TIME_HEADER_HEIGHT }}
          >
            <div
              className="sticky left-0 z-40 shrink-0 flex border-r border-border bg-muted/80"
              style={{ width: timeColsWidth }}
            >
              <div
                className="flex items-center justify-center text-xs font-bold uppercase tracking-wider text-muted-foreground border-r border-border"
                style={{ width: WEEKLY_GMT_COL_WIDTH }}
              >
                GMT
              </div>
              <div
                className="flex items-center justify-center text-xs font-bold uppercase tracking-wider text-primary"
                style={{ width: WEEKLY_DOH_COL_WIDTH }}
              >
                DOH
              </div>
            </div>

            {weekDates.map(dateStr => {
              const dayDate = parseISO(dateStr);
              const today = isToday(dayDate);
              const isSelected = dateStr === currentDate;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => onDayClick(dateStr)}
                  className={`flex-1 min-w-0 flex flex-col items-center justify-center border-r border-border last:border-r-0 transition-colors hover:bg-muted/80 ${
                    isSelected
                      ? 'bg-primary/15'
                      : today
                        ? 'bg-primary/5'
                        : ''
                  }`}
                  style={{ minWidth: WEEKLY_DAY_MIN_WIDTH }}
                >
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${
                    isSelected ? 'text-primary' : today ? 'text-primary/80' : 'text-muted-foreground'
                  }`}>
                    {format(dayDate, 'EEE')}
                  </span>
                  <span className={`text-sm font-bold leading-none ${
                    isSelected ? 'text-primary' : 'text-card-foreground'
                  }`}>
                    {format(dayDate, 'd MMM')}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Grid body */}
          <div className="flex relative w-full" style={{ height: WEEKLY_GRID_HEIGHT }}>
            {/* Sticky time columns */}
            <div
              className="sticky left-0 z-20 shrink-0 flex border-r border-border bg-card"
              style={{ width: timeColsWidth, height: WEEKLY_GRID_HEIGHT }}
            >
              {/* GMT labels */}
              <div className="relative border-r border-border/60" style={{ width: WEEKLY_GMT_COL_WIDTH }}>
                {TIME_SLOTS.map(slot => (
                  <div
                    key={`gmt-${slot}`}
                    className="absolute left-0 right-0 flex items-start justify-center pt-0.5 border-b border-border/30"
                    style={{
                      top: slot * WEEKLY_PX_PER_MIN,
                      height: WEEKLY_SLOT_MINUTES * WEEKLY_PX_PER_MIN,
                    }}
                  >
                    <span className="text-[11px] tabular-nums text-muted-foreground font-medium">
                      {formatSlotTime(gmtFromDoha(slot))}
                    </span>
                  </div>
                ))}
              </div>

              {/* DOH labels */}
              <div className="relative" style={{ width: WEEKLY_DOH_COL_WIDTH }}>
                {TIME_SLOTS.map(slot => (
                  <div
                    key={`doh-${slot}`}
                    className="absolute left-0 right-0 flex items-start justify-center pt-0.5 border-b border-border/30"
                    style={{
                      top: slot * WEEKLY_PX_PER_MIN,
                      height: WEEKLY_SLOT_MINUTES * WEEKLY_PX_PER_MIN,
                    }}
                  >
                    <span className="text-[11px] tabular-nums text-card-foreground font-semibold">
                      {formatSlotTime(slot)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Day columns + horizontal grid lines */}
            <div className="relative flex flex-1 min-w-0">
              {/* Horizontal 15-min grid lines across all days */}
              {TIME_SLOTS.map(slot => (
                <div
                  key={`hline-${slot}`}
                  className="absolute left-0 right-0 border-b border-border/35 pointer-events-none"
                  style={{ top: slot * WEEKLY_PX_PER_MIN }}
                />
              ))}

              {/* NOW line when today is in this week */}
              {todayInWeek && !isLoading && (
                <div
                  className="absolute left-0 right-0 z-10 pointer-events-none border-t-2 border-red-500"
                  style={{ top: nowMinute * WEEKLY_PX_PER_MIN }}
                >
                  <span className="absolute -top-3 left-1 text-[8px] font-bold text-red-500 bg-card px-1 rounded">
                    NOW
                  </span>
                </div>
              )}

              {isLoading ? (
                <WeeklyGridSkeleton />
              ) : (
                weekDates.map((dateStr, colIdx) => {
                  const dayDate = parseISO(dateStr);
                  const today = isToday(dayDate);
                  const isSelected = dateStr === currentDate;
                  const programmes = weekData.get(dateStr) ?? [];

                  return (
                    <div
                      key={dateStr}
                      className={`relative flex-1 min-w-0 border-r border-border last:border-r-0 ${
                        isSelected ? 'bg-primary/[0.04]' : today ? 'bg-primary/[0.02]' : ''
                      }`}
                      style={{ minWidth: WEEKLY_DAY_MIN_WIDTH, height: WEEKLY_GRID_HEIGHT }}
                    >
                      {programmes.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <p className="text-[10px] text-muted-foreground/60 text-center px-2">
                            No schedule
                          </p>
                        </div>
                      )}
                      {programmes.map((prog, i) => (
                        <WeeklyProgrammeBlock
                          key={prog.id}
                          programme={prog}
                          onClick={onCardClick}
                          index={i + colIdx * 2}
                        />
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {!isLoading && (
        <div className="flex items-center justify-between border-t border-border px-5 py-2.5 bg-muted/10">
          <p className="text-[11px] text-muted-foreground">
            Sun–Sat grid · scroll down for full day · click a day header for daily view
          </p>
          {todayInWeek && (
            <p className="text-[11px] text-primary font-medium tabular-nums">
              Live indicator active
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
};
