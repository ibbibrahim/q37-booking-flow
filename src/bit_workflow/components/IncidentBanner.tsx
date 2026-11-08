import { format } from 'date-fns';
import { Download, FileCheck2, FileClock, FileWarning, Loader2, PenLine, Radio, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Tone } from '@/lib/tone';
import { formatDuration } from '../utils/ticketUtils';
import type { BitTicketDetail } from '../types/ticket';

const BANNER_TONE: Partial<Record<Tone, { box: string; icon: string }>> = {
  destructive: { box: 'border-destructive/30 bg-destructive/5', icon: 'bg-destructive/10 text-destructive' },
  warning: { box: 'border-warning/30 bg-warning/5', icon: 'bg-warning/10 text-warning' },
  success: { box: 'border-success/30 bg-success/5', icon: 'bg-success/10 text-success' },
};

function at(iso: string | null): string {
  return iso ? format(new Date(iso), 'd MMM, HH:mm') : '—';
}

interface IncidentBannerProps {
  ticket: BitTicketDetail;
  now: Date;
  downloading: boolean;
  onOpenReport: () => void;
  onDownloadPdf: () => void;
}

export function IncidentBanner({ ticket, now, downloading, onOpenReport, onDownloadPdf }: IncidentBannerProps) {
  const dueMs = ticket.reportDueAt ? new Date(ticket.reportDueAt).getTime() - now.getTime() : null;

  let tone: Tone = 'destructive';
  let Icon: LucideIcon = Radio;
  let title = '';
  let detail = '';
  let primary: { label: string } | null = null;

  switch (ticket.reportState) {
    case 'due':
      tone = 'warning';
      Icon = FileClock;
      title = `Service restored ${at(ticket.onAirRestoredAt)}`;
      detail = `Incident report due in ${dueMs !== null ? formatDuration(dueMs) : '—'}`;
      primary = { label: 'Write report' };
      break;
    case 'overdue':
      tone = 'destructive';
      Icon = FileWarning;
      title = `Incident report overdue by ${dueMs !== null ? formatDuration(dueMs) : '—'}`;
      detail = `Service restored ${at(ticket.onAirRestoredAt)}`;
      primary = { label: 'Write report' };
      break;
    case 'submitted':
      tone = 'success';
      Icon = FileCheck2;
      title = `Incident report ${ticket.reportNo ?? ''} submitted`.replace('  ', ' ');
      detail = 'Management has been sent the report';
      primary = { label: 'View report' };
      break;
    default:
      title = `On-air incident · started ${at(ticket.incidentStartedAt)}`;
      detail = ticket.escalatedAt ? `Management notified ${at(ticket.escalatedAt)}` : 'Management email pending';
  }

  const styles = BANNER_TONE[tone] ?? BANNER_TONE.destructive!;
  const submitted = ticket.reportState === 'submitted';

  return (
    <div
      role="status"
      className={cn('flex flex-wrap items-center gap-3 rounded-xl border p-4', styles.box)}
    >
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', styles.icon)}>
        <Icon size={20} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-card-foreground">{title}</p>
        <p className="text-xs tabular-nums text-muted-foreground">{detail}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {primary && (
          <Button size="sm" variant={submitted ? 'outline' : 'default'} onClick={onOpenReport}>
            {submitted ? <FileCheck2 /> : <PenLine />}
            {primary.label}
          </Button>
        )}
        {submitted && (
          <Button size="sm" variant="outline" disabled={downloading} onClick={onDownloadPdf}>
            {downloading ? <Loader2 className="animate-spin" /> : <Download />}
            Download PDF
          </Button>
        )}
      </div>
    </div>
  );
}
