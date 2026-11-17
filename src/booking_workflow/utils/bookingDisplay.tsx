import { Camera, Download, Radio, Tag, UserPlus, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { getBookingTypeLabel, type BookingType } from '../types/workflow';

/** Per-type hues kept from the original list; an icon (instead of the status-style dot) marks it as a booking type. */
const BOOKING_TYPE_PILL: Record<BookingType, { pill: string; icon: LucideIcon }> = {
  'Incoming Feed': {
    pill: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    icon: Radio,
  },
  'Invite Guest for News': {
    pill: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800',
    icon: UserPlus,
  },
  'Invite Guest for Program': {
    pill: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800',
    icon: UserPlus,
  },
  'Download and Ingest': {
    pill: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    icon: Download,
  },
  'Camera Card and Ingest': {
    pill: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    icon: Camera,
  },
};

export function BookingTypePill({ type }: { type: BookingType }) {
  const style = BOOKING_TYPE_PILL[type] ?? { pill: 'bg-muted text-muted-foreground border-border', icon: Tag };
  const Icon = style.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        style.pill,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {getBookingTypeLabel(type)}
    </span>
  );
}
