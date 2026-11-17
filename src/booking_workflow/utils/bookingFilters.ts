import { endOfDay, startOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';

import type { Tone } from '@/lib/tone';
import type { Priority, UserRole, WorkflowStatus, BookingType } from '../types/workflow';
import type { BookingRequestSearchBody } from '../services/bookingApi';

export const STATUS_TONES: Record<WorkflowStatus, Tone> = {
  Draft: 'muted',
  Submitted: 'info',
  'With NOC': 'warning',
  'Clarification Requested': 'warning',
  'Resources Added': 'primary',
  'With Ingest': 'primary',
  Completed: 'success',
  'Not Done': 'destructive',
  'Partially Completed': 'success',
};

export const PRIORITY_TONES: Record<Priority, Tone> = {
  Normal: 'muted',
  High: 'warning',
  Urgent: 'destructive',
};

/** Statuses each role sees when no explicit status filter is chosen ("All states"). Mirrors visibleForRole in bookingApi.ts. */
export const ROLE_VISIBLE_STATUSES: Partial<Record<UserRole, WorkflowStatus[]>> = {
  NOC: [
    'Submitted',
    'With NOC',
    'Clarification Requested',
    'Resources Added',
    'With Ingest',
    'Completed',
    'Partially Completed',
    'Not Done',
  ],
  Ingest: ['With Ingest', 'Completed', 'Not Done', 'Partially Completed'],
};

export function rangeToApi(range: DateRange | undefined): { from?: string; to?: string } {
  if (!range?.from && !range?.to) return {};
  return {
    from: range.from ? startOfDay(range.from).toISOString() : undefined,
    to: range.to ? endOfDay(range.to).toISOString() : undefined,
  };
}

/** Search-body fields shared by the table and the board (everything except paging and status). */
export type BookingSharedFilters = Omit<BookingRequestSearchBody, 'page' | 'pageSize' | 'status' | 'statuses'>;

export interface BookingSharedFilterInput {
  userRole: UserRole;
  /** Already-debounced search text. */
  searchQuery: string;
  bookingTypeFilter: BookingType | 'All';
  createdDateRange: DateRange | undefined;
  onlyMine: boolean;
  userId: number | undefined;
}

/** Single source of truth for the non-status filters, so the table fetch and board columns can't drift. */
export function buildBookingSharedFilters({
  userRole,
  searchQuery,
  bookingTypeFilter,
  createdDateRange,
  onlyMine,
  userId,
}: BookingSharedFilterInput): BookingSharedFilters {
  const created = rangeToApi(createdDateRange);
  return {
    searchQuery: searchQuery.trim() || undefined,
    // NOC only deals with Incoming Feed requests — Download/Camera Card ingest bookings aren't theirs.
    bookingType: userRole === 'NOC' ? 'Incoming Feed' : bookingTypeFilter !== 'All' ? bookingTypeFilter : undefined,
    createdAtFrom: created.from ?? null,
    createdAtTo: created.to ?? null,
    // Requester self-filter — Booking screen only.
    createdBy: userRole === 'Booking' && onlyMine && userId ? userId : undefined,
  };
}
