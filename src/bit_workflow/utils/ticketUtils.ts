import { type Tone } from '@/lib/tone';
import type { IncidentFrequency, IncidentReportPriority } from '../types/incident';
import type {
  BitTicketEvent,
  ReportState,
  SlaInfo,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../types/ticket';

// ── Status ──────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<TicketStatus, string> = {
  new: 'New',
  in_progress: 'In progress',
  on_hold: 'On hold',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const STATUS_TONES: Record<TicketStatus, Tone> = {
  new: 'info',
  in_progress: 'primary',
  on_hold: 'warning',
  resolved: 'success',
  closed: 'muted',
};

export const OPEN_STATUSES: TicketStatus[] = ['new', 'in_progress', 'on_hold'];
export const DONE_STATUSES: TicketStatus[] = ['resolved', 'closed'];

/** Allowed status transitions (mirrors the API contract). */
export const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  new: ['in_progress', 'on_hold', 'resolved'],
  in_progress: ['on_hold', 'resolved'],
  on_hold: ['in_progress', 'resolved'],
  resolved: ['in_progress', 'closed'],
  closed: ['in_progress'],
};

// ── Priority ────────────────────────────────────────────────────────

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const PRIORITY_TONES: Record<TicketPriority, Tone> = {
  critical: 'destructive',
  high: 'warning',
  medium: 'info',
  low: 'muted',
};

export const PRIORITIES: TicketPriority[] = ['critical', 'high', 'medium', 'low'];

/** SLA targets in minutes per priority (display hint — the server is authoritative). */
export const SLA_TARGETS: Record<TicketPriority, { responseMinutes: number; resolveMinutes: number }> = {
  critical: { responseMinutes: 15, resolveMinutes: 4 * 60 },
  high: { responseMinutes: 60, resolveMinutes: 8 * 60 },
  medium: { responseMinutes: 4 * 60, resolveMinutes: 24 * 60 },
  low: { responseMinutes: 8 * 60, resolveMinutes: 72 * 60 },
};

export function formatTargetMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  if (hours < 24 || hours % 24 !== 0) return `${hours} h`;
  return `${hours / 24} d`;
}

export function slaHint(priority: TicketPriority): string {
  const t = SLA_TARGETS[priority];
  return `Respond within ${formatTargetMinutes(t.responseMinutes)} · Resolve within ${formatTargetMinutes(t.resolveMinutes)}`;
}

// ── Category ────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  playout: 'Playout',
  graphics: 'Graphics',
  video_server: 'Video Server / Replay',
  mam_storage: 'MAM & Storage',
  audio: 'Audio',
  network: 'Network',
  hardware: 'Hardware',
  software: 'Software',
  access: 'Access & Accounts',
  other: 'Other',
};

export const CATEGORIES: TicketCategory[] = [
  'playout',
  'graphics',
  'video_server',
  'mam_storage',
  'audio',
  'network',
  'hardware',
  'software',
  'access',
  'other',
];

// ── Time / SLA ──────────────────────────────────────────────────────

/** 2h 14m / 35m / 3d 4h. Sub-minute durations read "<1m". */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(Math.abs(ms) / 60000);
  if (totalMinutes < 1) return '<1m';
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}

export function slaChip(sla: SlaInfo, now: Date): { label: string; tone: Tone } {
  const due = new Date(sla.dueAt).getTime();
  switch (sla.state) {
    case 'met':
      return { label: 'Met', tone: 'success' };
    case 'paused':
      return { label: 'Paused', tone: 'muted' };
    case 'breached': {
      const end = sla.metAt ? new Date(sla.metAt).getTime() : now.getTime();
      return { label: `Breached ${formatDuration(end - due)}`, tone: 'destructive' };
    }
    case 'at_risk':
      return { label: `${formatDuration(due - now.getTime())} left`, tone: 'warning' };
    default:
      return { label: `${formatDuration(due - now.getTime())} left`, tone: 'muted' };
  }
}

/** Elapsed fraction (0..1) of an SLA window that started at `startAt`. */
export function slaElapsedFraction(sla: SlaInfo, startAt: string, now: Date, pausedAt?: string | null): number {
  const start = new Date(startAt).getTime();
  const due = new Date(sla.dueAt).getTime();
  const end = sla.metAt
    ? new Date(sla.metAt).getTime()
    : sla.state === 'paused' && pausedAt
      ? new Date(pausedAt).getTime()
      : now.getTime();
  const total = due - start;
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, (end - start) / total));
}

export function slaTone(sla: SlaInfo): Tone {
  switch (sla.state) {
    case 'breached':
      return 'destructive';
    case 'at_risk':
      return 'warning';
    case 'met':
      return 'success';
    default:
      return 'primary';
  }
}

// ── People ──────────────────────────────────────────────────────────

export function firstNameOf(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] || '—';
}

// ── Misc ────────────────────────────────────────────────────────────

export function normalizeUrl(url: string): string {
  return /^[a-z][a-z\d+.-]*:\/\//i.test(url) ? url : `https://${url}`;
}

function valueLabel(eventType: string, value: string | null): string {
  if (!value) return '—';
  if (eventType === 'status') return STATUS_LABELS[value as TicketStatus] ?? value;
  if (eventType === 'priority') return PRIORITY_LABELS[value as TicketPriority] ?? value;
  return value;
}

/** One-line system sentence for an activity event. */
export function eventText(e: BitTicketEvent): string {
  const who = e.actorName || 'System';
  switch (e.eventType) {
    case 'created':
      return `${who} created this ticket`;
    case 'status':
      return `${who} changed status from ${valueLabel('status', e.fromValue)} to ${valueLabel('status', e.toValue)}`;
    case 'priority':
      return `${who} changed priority from ${valueLabel('priority', e.fromValue)} to ${valueLabel('priority', e.toValue)}`;
    case 'assigned':
      if (!e.toValue) return `${who} unassigned this ticket`;
      return e.fromValue
        ? `${who} reassigned this ticket from ${e.fromValue} to ${e.toValue}`
        : `${who} assigned this ticket to ${e.toValue}`;
    case 'vendor':
      if (!e.toValue) return `${who} removed the vendor link`;
      return `${who} linked vendor ${e.toValue}`;
    case 'on_air':
      return e.toValue === 'false' || e.toValue === '0'
        ? `${who} removed the on-air flag`
        : `${who} marked this as an on-air incident`;
    case 'escalated':
      return 'Management was notified';
    case 'report_submitted':
      return `${who} submitted incident report${e.toValue ? ` ${e.toValue}` : ''}`;
    case 'edited':
      return `${who} edited ${e.toValue || 'the ticket details'}`;
    default:
      return `${who} updated this ticket`;
  }
}

// ── On-air incidents ────────────────────────────────────────────────

export function reportStateMeta(state: ReportState): { label: string; tone: Tone } {
  switch (state) {
    case 'in_progress':
      return { label: 'Incident ongoing', tone: 'info' };
    case 'due':
      return { label: 'Report due', tone: 'warning' };
    case 'overdue':
      return { label: 'Report overdue', tone: 'destructive' };
    case 'submitted':
      return { label: 'Report submitted', tone: 'success' };
    default:
      return { label: 'No report', tone: 'muted' };
  }
}

/** 95 -> "1h 35m"; null -> "—". */
export function formatDowntime(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '—';
  return minutes < 1 ? '<1m' : formatDuration(minutes * 60000);
}

export const FREQUENCY_LABELS: Record<Exclude<IncidentFrequency, ''>, string> = {
  one_time: 'One-time',
  intermittent: 'Intermittent',
  recurring: 'Recurring',
  continuous: 'Continuous',
};

export const FREQUENCIES: Exclude<IncidentFrequency, ''>[] = ['one_time', 'intermittent', 'recurring', 'continuous'];

export const REPORT_PRIORITY_LABELS: Record<IncidentReportPriority, string> = {
  critical: 'Critical',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
};

export const REPORT_PRIORITY_TONES: Record<IncidentReportPriority, Tone> = {
  critical: 'destructive',
  high: 'warning',
  normal: 'info',
  low: 'muted',
};

export const REPORT_PRIORITIES: IncidentReportPriority[] = ['critical', 'high', 'normal', 'low'];

/** ISO UTC -> value for a datetime-local input (local time). */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value (local time) -> ISO UTC; empty -> null. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Countdown text for a report deadline: "11h 40m left" / "Overdue by 2h". */
export function reportDueText(dueAt: string | null, now: Date): { text: string; overdue: boolean } | null {
  if (!dueAt) return null;
  const diff = new Date(dueAt).getTime() - now.getTime();
  return diff >= 0
    ? { text: `${formatDuration(diff)} left`, overdue: false }
    : { text: `Overdue by ${formatDuration(diff)}`, overdue: true };
}
