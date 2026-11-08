import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Check, Copy, Download, ExternalLink, FileText, Loader2, Mail, PenLine, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/contexts/ToastContext';
import { UserAvatar } from '@/components/ui/user-avatar';
import { cn } from '@/lib/utils';
import { TONE_BAR } from '@/lib/tone';
import {
  CATEGORY_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
  STATUS_LABELS,
  STATUS_TRANSITIONS,
  formatDowntime,
  reportDueText,
  normalizeUrl,
  slaElapsedFraction,
  slaTone,
} from '../utils/ticketUtils';
import { ReportStateChip } from './ReportStateChip';
import { TicketSlaChip } from './TicketSlaChip';
import type {
  BitTicketAssignee,
  BitTicketDetail,
  SlaInfo,
  TicketPriority,
  TicketStatus,
} from '../types/ticket';

const UNASSIGNED = '__unassigned__';

function fmt(iso: string | null): string {
  return iso ? format(new Date(iso), 'd MMM yyyy, HH:mm') : '—';
}

function PanelCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-xl p-4">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-card-foreground">{children}</span>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast('Could not copy', 'error');
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-6 w-6 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label={`Copy ${label}`}
      onClick={handleCopy}
    >
      {copied ? <Check className="text-success" /> : <Copy />}
    </Button>
  );
}

function SlaRow({
  label,
  sla,
  startAt,
  now,
  pausedAt,
}: {
  label: string;
  sla: SlaInfo;
  startAt: string;
  now: Date;
  pausedAt?: string | null;
}) {
  const fraction = slaElapsedFraction(sla, startAt, now, pausedAt);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-card-foreground">{label}</span>
        <TicketSlaChip sla={sla} now={now} />
      </div>
      <Progress value={fraction * 100} className={cn('h-1.5', TONE_BAR[slaTone(sla)])} />
      <p className="text-xs tabular-nums text-muted-foreground">
        {sla.metAt ? `Met ${format(new Date(sla.metAt), 'd MMM, HH:mm')} · ` : ''}
        Due {format(new Date(sla.dueAt), 'd MMM, HH:mm')}
        {sla.state === 'paused' && ' · paused while on hold'}
      </p>
    </div>
  );
}

interface TicketSidePanelProps {
  ticket: BitTicketDetail;
  now: Date;
  assignees: BitTicketAssignee[];
  currentUserId?: number;
  busy: boolean;
  onStatusChange: (status: TicketStatus) => void;
  onPriorityChange: (priority: TicketPriority) => void;
  onAssign: (userId: number | null) => void;
  onOpenReport: () => void;
  onDownloadPdf: () => void;
  downloading: boolean;
}

export function TicketSidePanel({
  ticket,
  now,
  assignees,
  currentUserId,
  busy,
  onStatusChange,
  onPriorityChange,
  onAssign,
  onOpenReport,
  onDownloadPdf,
  downloading,
}: TicketSidePanelProps) {
  const statusOptions: TicketStatus[] = [ticket.status, ...STATUS_TRANSITIONS[ticket.status]];
  const assigneeKnown = ticket.assigneeUserId !== null && assignees.some((a) => a.userId === ticket.assigneeUserId);
  const vendor = ticket.vendor;
  const due = reportDueText(ticket.reportDueAt, now);
  const reportSubmitted = ticket.reportState === 'submitted';
  const hasDraft = ticket.reportStatus === 'draft';
  const downtimeMinutes =
    ticket.incidentStartedAt && ticket.onAirRestoredAt
      ? Math.max(0, Math.round((new Date(ticket.onAirRestoredAt).getTime() - new Date(ticket.incidentStartedAt).getTime()) / 60000))
      : null;

  return (
    <div className="space-y-4">
      {ticket.onAirImpact && (
        <PanelCard title="Incident report">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <ReportStateChip state={ticket.reportState} />
              {ticket.reportNo && (
                <span className="font-mono text-xs tabular-nums text-muted-foreground">{ticket.reportNo}</span>
              )}
            </div>
            <div className="space-y-2 tabular-nums">
              {!reportSubmitted && due && (
                <Row label="Deadline">
                  <span className={cn(due.overdue && 'font-medium text-destructive')}>{due.text}</span>
                </Row>
              )}
              <Row label="Downtime">{formatDowntime(downtimeMinutes)}</Row>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={reportSubmitted ? 'outline' : 'default'} onClick={onOpenReport}>
                {reportSubmitted ? <FileText /> : <PenLine />}
                {reportSubmitted ? 'View report' : hasDraft ? 'Continue draft' : 'Write report'}
              </Button>
              {(reportSubmitted || hasDraft) && (
                <Button size="sm" variant="outline" disabled={downloading} onClick={onDownloadPdf}>
                  {downloading ? <Loader2 className="animate-spin" /> : <Download />}
                  Download PDF
                </Button>
              )}
            </div>
          </div>
        </PanelCard>
      )}

      <PanelCard title="SLA">
        <div className="space-y-4">
          <SlaRow label="Response" sla={ticket.responseSla} startAt={ticket.createdAt} now={now} />
          <SlaRow
            label="Resolution"
            sla={ticket.resolveSla}
            startAt={ticket.createdAt}
            now={now}
            pausedAt={ticket.slaPausedAt}
          />
        </div>
      </PanelCard>

      <PanelCard title="Details">
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Status</p>
            <Select value={ticket.status} onValueChange={(v) => onStatusChange(v as TicketStatus)} disabled={busy}>
              <SelectTrigger aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Priority</p>
            <Select value={ticket.priority} onValueChange={(v) => onPriorityChange(v as TicketPriority)} disabled={busy}>
              <SelectTrigger aria-label="Priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Assignee</p>
              {currentUserId !== undefined && ticket.assigneeUserId !== currentUserId && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAssign(currentUserId)}
                  className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                >
                  Assign to me
                </button>
              )}
            </div>
            <Select
              value={ticket.assigneeUserId ? String(ticket.assigneeUserId) : UNASSIGNED}
              onValueChange={(v) => onAssign(v === UNASSIGNED ? null : Number(v))}
              disabled={busy}
            >
              <SelectTrigger aria-label="Assignee">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {(assignees.length > 0 || (ticket.assigneeUserId && !assigneeKnown)) && <SelectSeparator />}
                {ticket.assigneeUserId && !assigneeKnown && (
                  <SelectItem value={String(ticket.assigneeUserId)}>{ticket.assigneeName}</SelectItem>
                )}
                {assignees.map((a) => (
                  <SelectItem key={a.userId} value={String(a.userId)}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 border-t border-border pt-3">
            <Row label="Category">{CATEGORY_LABELS[ticket.category]}</Row>
            <Row label="Affected system">{ticket.affectedSystem || <span className="text-muted-foreground/50">—</span>}</Row>
          </div>
        </div>
      </PanelCard>

      <PanelCard title="Vendor">
        {vendor ? (
          <div className="space-y-3">
            <p className="font-medium text-card-foreground">{vendor.name}</p>
            {ticket.vendorCaseRef && (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-2.5 py-1.5">
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground">Case ref</p>
                  <p className="truncate font-mono text-sm text-card-foreground">{ticket.vendorCaseRef}</p>
                </div>
                <CopyButton value={ticket.vendorCaseRef} label="case reference" />
              </div>
            )}
            {vendor.portalUrl && (
              <a
                href={normalizeUrl(vendor.portalUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink size={13} className="shrink-0" />
                <span className="truncate">Open support portal</span>
              </a>
            )}
            {vendor.supportEmail && (
              <a
                href={`mailto:${vendor.supportEmail}`}
                className="flex items-center gap-1.5 text-sm text-card-foreground hover:text-primary"
              >
                <Mail size={13} className="shrink-0 text-muted-foreground" />
                <span className="truncate">{vendor.supportEmail}</span>
              </a>
            )}
            {vendor.contacts.length > 0 && (
              <ul className="space-y-1.5">
                {vendor.contacts.map((c, i) => (
                  <li key={`${c.name}-${c.phone}-${i}`} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium text-card-foreground">{c.name}</span>
                    {c.phone && (
                      <a
                        href={`tel:${c.phone.replace(/[^+\d]/g, '')}`}
                        className="inline-flex shrink-0 items-center gap-1.5 tabular-nums text-muted-foreground hover:text-primary"
                      >
                        <Phone size={12} />
                        {c.phone}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No vendor linked</p>
        )}
      </PanelCard>

      <PanelCard title="People">
        <div className="space-y-3">
          <Row label="Raised by">
            <span className="inline-flex items-center gap-2">
              <UserAvatar name={ticket.createdByName} />
              {ticket.createdByName}
            </span>
          </Row>
          <Row label="Assignee">
            {ticket.assigneeName ? (
              <span className="inline-flex items-center gap-2">
                <UserAvatar name={ticket.assigneeName} />
                {ticket.assigneeName}
              </span>
            ) : (
              <span className="italic text-muted-foreground">Unassigned</span>
            )}
          </Row>
          <div className="border-t border-border pt-3">
            <p className="mb-2 text-xs text-muted-foreground">
              Followers <span className="tabular-nums">({ticket.followers.length})</span>
            </p>
            {ticket.followers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No followers yet</p>
            ) : (
              <ul className="space-y-1.5">
                {ticket.followers.map((f) => (
                  <li key={f.userId} className="flex items-center gap-2 text-sm text-card-foreground">
                    <UserAvatar name={f.userName} />
                    {f.userName}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </PanelCard>

      <PanelCard title="Dates">
        <div className="space-y-2 tabular-nums">
          <Row label="Created">{fmt(ticket.createdAt)}</Row>
          <Row label="First response">{fmt(ticket.firstResponseAt)}</Row>
          <Row label="Resolved">{fmt(ticket.resolvedAt)}</Row>
          <Row label="Closed">{fmt(ticket.closedAt)}</Row>
        </div>
      </PanelCard>
    </div>
  );
}
