import React from 'react';
import { motion } from 'motion/react';
import { format, parseISO, isToday, startOfWeek, addDays } from 'date-fns';
import { RefreshCw, CalendarX } from 'lucide-react';
import type { Programme } from '../types/epg.types';
import { ProgrammeCard } from './ProgrammeCard';
import { SkeletonCard } from './SkeletonCard';

interface WeeklyViewProps {
  currentDate: string;
  weekData: Map<string, Programme[]>;
  isLoading: boolean;
  error: string | null;
  onCardClick: (p: Programme) => void;
  onDayClick: (date: string) => void;
  onRetry: () => void;
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
  // Build the Mon–Sun dates for the week containing currentDate
  const base = parseISO(currentDate);
  const weekStart = startOfWeek(base, { weekStartsOn: 1 });
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return format(d, 'yyyy-MM-dd');
  });

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

  return (
    <motion.div
      key="weekly"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="grid grid-cols-7 gap-4 sm:gap-5"
    >
      {weekDates.map((dateStr, colIdx) => {
        const dayDate = parseISO(dateStr);
        const today = isToday(dayDate);
        const programmes = isLoading ? [] : (weekData.get(dateStr) ?? []);

        return (
          <motion.div
            key={dateStr}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: colIdx * 0.05, duration: 0.25 }}
            className={`flex flex-col rounded-xl border overflow-hidden shadow-sm ${
              today
                ? 'border-primary bg-primary/5 shadow-primary/20'
                : 'border-border bg-card'
            }`}
          >
            {/* Day header */}
            <button
              onClick={() => onDayClick(dateStr)}
              className={`w-full px-2 py-2.5 text-center border-b transition-colors hover:bg-muted/60 ${
                today ? 'border-primary/30' : 'border-border'
              }`}
            >
              <p className={`text-xs font-bold uppercase tracking-wide ${
                today ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {format(dayDate, 'EEE')}
              </p>
              <p className={`text-lg font-bold leading-tight ${
                today ? 'text-primary' : 'text-card-foreground'
              }`}>
                {format(dayDate, 'd')}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {format(dayDate, 'MMM')}
              </p>
              {today && (
                <span className="inline-block mt-1 text-[9px] font-bold text-primary bg-primary/10 border border-primary/30 px-1.5 py-0.5 rounded-full">
                  TODAY
                </span>
              )}
            </button>

            {/* Programme list */}
            <div className="flex-1 overflow-y-auto p-1.5 space-y-1 max-h-[480px]">
              {isLoading
                ? Array.from({ length: 5 }, (_, i) => (
                    <SkeletonCard key={i} index={i + colIdx * 3} variant="list" />
                  ))
                : programmes.length === 0
                  ? (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-[10px] text-muted-foreground text-center">
                        No programmes
                      </p>
                    </div>
                  )
                  : programmes.map((prog, i) => (
                    <ProgrammeCard
                      key={prog.id}
                      programme={prog}
                      onClick={onCardClick}
                      index={i + colIdx * 3}
                      variant="list"
                    />
                  ))
              }
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
};
