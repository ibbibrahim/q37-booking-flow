import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateDisplay } from '../utils/dateUtils';

export interface WeekNavigatorProps {
  weekStart: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function WeekNavigator({
  weekStart,
  onPrevWeek,
  onNextWeek,
}: WeekNavigatorProps) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const year = weekEnd.getFullYear();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={onPrevWeek}
        aria-label="Previous week">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[180px] text-center font-medium text-sm">
        {formatDateDisplay(weekStart)} - {formatDateDisplay(weekEnd)} {year}
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={onNextWeek}
        aria-label="Next week">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
