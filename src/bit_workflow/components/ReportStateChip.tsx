import { FileCheck2, FileClock, FileWarning, Radio, type LucideIcon } from 'lucide-react';
import { pillClass } from '@/lib/tone';
import { reportDueText, reportStateMeta } from '../utils/ticketUtils';
import type { ReportState } from '../types/ticket';

const ICONS: Partial<Record<ReportState, LucideIcon>> = {
  in_progress: Radio,
  due: FileClock,
  overdue: FileWarning,
  submitted: FileCheck2,
};

interface ReportStateChipProps {
  state: ReportState;
  /** When given, due / overdue chips append a live countdown. */
  dueAt?: string | null;
  now?: Date;
}

export function ReportStateChip({ state, dueAt, now }: ReportStateChipProps) {
  if (state === 'none') return null;
  const { label, tone } = reportStateMeta(state);
  const Icon = ICONS[state];
  const due = (state === 'due' || state === 'overdue') && now ? reportDueText(dueAt ?? null, now) : null;
  return (
    <span className={`${pillClass(tone)} tabular-nums`}>
      {Icon && <Icon size={11} className="shrink-0" aria-hidden />}
      {due ? (state === 'overdue' ? due.text : `${label} · ${due.text}`) : label}
    </span>
  );
}
