import type {
  ChecklistItem,
  ChecklistSubmissionStatus,
  ChecklistTemplate,
  ChecklistType,
} from '../types/checklist';

/** Section names in template display order. */
export function sectionNamesFrom(templates: ChecklistTemplate[]): string[] {
  const seen: string[] = [];
  for (const t of templates) {
    if (!seen.includes(t.sectionName)) seen.push(t.sectionName);
  }
  return seen;
}

/** Empty item set for a not-yet-started checklist (204 from the current endpoint). */
export function freshItemsFrom(templates: ChecklistTemplate[]): ChecklistItem[] {
  return templates.map((t) => ({
    templateId: t.id,
    isCompleted: false,
    completionTime: '',
    remarks: '',
    completedBy: '',
  }));
}

/** Unique non-empty completedBy names, in first-appearance order. */
export function engineersOn(items: ChecklistItem[]): string[] {
  return [...new Set(items.map((i) => i.completedBy).filter(Boolean))];
}

/** Local-timezone ISO date (yyyy-MM-dd) — avoids UTC day-shift issues. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * The broadcast day rolls over at 03:00, not midnight — a checklist stays "current"
 * until 3 AM the next morning. Must stay in sync with the backend's
 * BitChecklist:DayRolloverHour setting.
 */
const DAY_ROLLOVER_HOUR = 3;

/** "Now" shifted so times before 03:00 still belong to the previous broadcast day. */
export function broadcastNow(): Date {
  return new Date(Date.now() - DAY_ROLLOVER_HOUR * 60 * 60 * 1000);
}

/** Monday of the week containing `d`. */
export function weekStart(d: Date): Date {
  const result = new Date(d);
  const day = result.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

/** Canonical period date for the current daily/weekly/monthly cycle (broadcast-day based). */
export function periodDateFor(type: ChecklistType, now: Date = broadcastNow()): string {
  if (type === 'weekly') return toISODate(weekStart(now));
  if (type === 'monthly') return toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
  return toISODate(now);
}

/** Human label for the current period, e.g. "Tuesday, 7 July 2026" / "6 – 12 July 2026" / "July 2026". */
export function periodLabelFor(type: ChecklistType, now: Date = broadcastNow()): string {
  if (type === 'daily') {
    return now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  if (type === 'weekly') {
    const start = weekStart(now);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const sameMonth = start.getMonth() === end.getMonth();
    const startLabel = start.toLocaleDateString('en-GB', sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' });
    const endLabel = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    return `${startLabel} – ${endLabel}`;
  }
  return now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

/** Label for a stored periodDate (day / week start / month start), e.g. for history rows. */
export function periodLabelForDate(type: ChecklistType, periodDate: string): string {
  const d = new Date(periodDate + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return periodDate;
  if (type === 'daily') {
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
  if (type === 'weekly') {
    return periodLabelFor('weekly', d);
  }
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function checklistTypeLabel(type: ChecklistType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function isChecklistType(value: string | undefined): value is ChecklistType {
  return value === 'daily' || value === 'weekly' || value === 'monthly';
}

export function submissionStatusLabel(status?: ChecklistSubmissionStatus): string {
  if (status === 'completed') return 'Completed';
  if (status === 'in_progress') return 'In Progress';
  return 'Not Started';
}

export function submissionStatusBadgeClass(status?: ChecklistSubmissionStatus): string {
  if (status === 'completed') return 'border-transparent bg-success/15 text-success';
  if (status === 'in_progress') return 'border-transparent bg-warning/15 text-warning';
  return 'border-transparent bg-muted text-muted-foreground';
}
