import type { Tone } from '@/lib/tone';

export const STATUS_TONES: Record<string, Tone> = {
  Submitted: 'warning',
  Completed: 'info',
  NeedsRevision: 'destructive',
  Approved: 'success',
};

export const PRIORITY_TONES: Record<string, Tone> = {
  Normal: 'muted',
  Urgent: 'destructive',
};

export interface CreativeListFilterState {
  search: string;
  requestType: string;
}

/** Filters shared by the table query and every board column, so the two views can't drift. */
export function buildCreativeListFilters({ search, requestType }: CreativeListFilterState) {
  return {
    search,
    requestType: requestType === 'All' ? undefined : requestType,
  };
}

export type CreativeSharedFilters = ReturnType<typeof buildCreativeListFilters>;
