import React from 'react';
import { motion } from 'motion/react';
import { format, parseISO, isToday, startOfWeek, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Programme } from '../types/epg.types';

interface WeekNavigatorProps {
  currentDate: string;
  weekData: Map<string, Programme[]>;
  onDayClick: (date: string) => void;
  onNavigateWeek: (direction: -1 | 1) => void;
  isLoading?: boolean;
}

export const WeekNavigator: React.FC<WeekNavigatorProps> = ({
  currentDate,
  weekData,
  onDayClick,
  onNavigateWeek,
  isLoading,
}) => {
  const base = parseISO(currentDate);
  const weekStart = startOfWeek(base, { weekStartsOn: 1 });
  const weekDates = Array.from({ length: 7 }, (_, i) =>
    format(addDays(weekStart, i), 'yyyy-MM-dd')
  );

  return (
    <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-border bg-card shadow-sm">
      {/* Prev week */}
      <button
        onClick={() => onNavigateWeek(-1)}
        className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-card-foreground hover:bg-muted transition-colors"
        title="Previous week"
      >
        <ChevronLeft size={15} />
      </button>

      {/* Week strip */}
      <div className="flex-1 grid grid-cols-7 gap-2">
        {weekDates.map((dateStr, idx) => {
          const dayDate = parseISO(dateStr);
          const today = isToday(dayDate);
          const isSelected = dateStr === currentDate;
          const progs = weekData.get(dateStr);
          const count = progs?.length ?? null;
          const liveCount = progs?.filter(p => p.isLive).length ?? 0;

          return (
            <motion.button
              key={dateStr}
              onClick={() => onDayClick(dateStr)}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.2 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`flex flex-col items-center rounded-lg py-1.5 px-1 transition-all text-center ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                  : today
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:bg-muted hover:text-card-foreground'
              }`}
            >
              <span className={`text-[9px] font-bold uppercase tracking-wider leading-tight ${
                isSelected ? 'text-primary-foreground/80' : ''
              }`}>
                {format(dayDate, 'EEE')}
              </span>
              <span className={`text-sm font-bold leading-tight ${
                isSelected ? 'text-primary-foreground' : ''
              }`}>
                {format(dayDate, 'd')}
              </span>
              <span className={`text-[9px] leading-tight ${
                isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
              }`}>
                {format(dayDate, 'MMM')}
              </span>

              {/* Programme count badge */}
              {isLoading ? (
                <div className="w-6 h-3 rounded-full bg-current/20 animate-pulse mt-0.5" />
              ) : count !== null ? (
                <div className={`flex items-center gap-0.5 mt-0.5 ${
                  isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                }`}>
                  <span className="text-[8px] font-semibold">{count} ev</span>
                  {liveCount > 0 && (
                    <span className={`text-[8px] font-bold ${
                      isSelected ? 'text-yellow-300' : 'text-green-600 dark:text-green-400'
                    }`}>
                      · {liveCount}L
                    </span>
                  )}
                </div>
              ) : null}
            </motion.button>
          );
        })}
      </div>

      {/* Next week */}
      <button
        onClick={() => onNavigateWeek(1)}
        className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-card-foreground hover:bg-muted transition-colors"
        title="Next week"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
};
