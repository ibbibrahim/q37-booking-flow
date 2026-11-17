import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';

import type { Tone } from '@/lib/tone';
import type { CallSheetStatus } from '../types/callsheet';

export const STATUS_TONES: Record<CallSheetStatus, Tone> = {
  Draft: 'muted',
  'With Technical Store': 'warning',
  Submitted: 'info',
  Completed: 'success',
  Cancelled: 'destructive',
};

/** Search-body fields shared by the table and the board (everything except paging and status). */
export interface CallSheetSharedFilters {
  searchQuery?: string;
  driverNeeded?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export interface CallSheetSharedFilterInput {
  /** Already-debounced search text. */
  searchQuery: string;
  driverFilter: string;
  dateRange: DateRange | undefined;
}

export function buildCallSheetSharedFilters({
  searchQuery,
  driverFilter,
  dateRange,
}: CallSheetSharedFilterInput): CallSheetSharedFilters {
  const filters: CallSheetSharedFilters = {};

  if (searchQuery.trim()) {
    filters.searchQuery = searchQuery.trim();
  }

  if (driverFilter !== 'All') {
    filters.driverNeeded = driverFilter === 'Yes';
  }

  if (dateRange?.from) {
    filters.dateFrom = format(dateRange.from, 'yyyy-MM-dd');
  }
  if (dateRange?.to) {
    filters.dateTo = format(dateRange.to, 'yyyy-MM-dd');
  }

  return filters;
}
