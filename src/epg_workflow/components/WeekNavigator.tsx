import React from 'react';
import { motion } from 'motion/react';
import { format, parseISO, isToday, startOfWeek, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WeekNavigatorProps {
  currentDate: string;
  onDayClick: (date: string) => void;
  onNavigateWeek: (direction: -1 | 1) => void;
}

export const WeekNavigator: React.FC<WeekNavigatorProps> = ({
  currentDate,
  onDayClick,
  onNavigateWeek,
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
