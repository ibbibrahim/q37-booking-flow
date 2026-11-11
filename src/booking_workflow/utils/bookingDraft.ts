import { readFormDraft } from '@/hooks/useFormDraft';
import { getBookingTypeLabel } from '../types/workflow';

const DRAFT_PREFIX = 'booking-workflow:draft';

/** Snapshot of the new-booking form that is autosaved locally. */
export type BookingDraftData = {
  bookingMode: 'single' | 'bulk';
  formData: Record<string, string>;
  downloadLinks: { source: string; url: string }[];
  bulkOptions: {
    startDate: string;
    endDate: string;
    frequency: string;
    selectedDays: string[];
    appendDate: boolean;
  };
};

export interface BookingDraftSummary {
  title: string;
  bookingTypeLabel: string;
  linkCount: number;
  savedAt: Date;
}

export function bookingDraftKey(userId: string | number): string {
  return `${DRAFT_PREFIX}:new:${userId}`;
}

export function clearBookingDraft(userId: string | number): void {
  try {
    localStorage.removeItem(bookingDraftKey(userId));
  } catch {
    // Storage unavailable - nothing to clear.
  }
}

export function readBookingDraftSummary(userId: string | number): BookingDraftSummary | null {
  const draft = readFormDraft<BookingDraftData>(bookingDraftKey(userId));
  const formData = draft?.data?.formData;
  if (!draft || !formData) return null;
  const bookingType = formData.bookingType ?? '';
  const linkCount =
    bookingType === 'Download and Ingest'
      ? (draft.data.downloadLinks ?? []).filter((l) => l.url?.trim()).length
      : 0;
  return {
    title: formData.title?.trim() || 'Untitled booking',
    bookingTypeLabel: bookingType ? getBookingTypeLabel(bookingType) : '',
    linkCount,
    savedAt: new Date(draft.savedAt),
  };
}
