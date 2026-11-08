import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNowStrict } from 'date-fns';
import {
  ArrowRightLeft,
  Building2,
  FileCheck2,
  Flag,
  Megaphone,
  Loader2,
  Lock,
  Pencil,
  Radio,
  Send,
  Sparkles,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiFileUploadField, type UploadedFileRef } from '@/components/ui/multi-file-upload-field';
import { Textarea } from '@/components/ui/textarea';
import { bitTicketApi } from '@/api/bitTicketApi';
import { getApiErrorMessage } from '@/api/bitChecklistApi';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/lib/utils';
import { eventText } from '../utils/ticketUtils';
import { TicketAttachmentGallery } from './TicketAttachmentGallery';
import { UserAvatar } from '@/components/ui/user-avatar';
import type { BitTicketComment, BitTicketDetail, BitTicketEvent, CommentKind } from '../types/ticket';

type Filter = 'all' | 'update' | 'note' | 'history';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'update', label: 'Updates' },
  { key: 'note', label: 'Notes' },
  { key: 'history', label: 'History' },
];

const EVENT_ICONS: Record<string, LucideIcon> = {
  created: Sparkles,
  status: ArrowRightLeft,
  priority: Flag,
  assigned: UserCheck,
  vendor: Building2,
  edited: Pencil,
  on_air: Radio,
  escalated: Megaphone,
  report_submitted: FileCheck2,
};

type TimelineItem =
  | { type: 'comment'; at: number; key: string; comment: BitTicketComment }
  | { type: 'event'; at: number; key: string; event: BitTicketEvent };

function timeLabel(iso: string): string {
  return `${formatDistanceToNowStrict(new Date(iso), { addSuffix: true })} · ${format(new Date(iso), 'd MMM, HH:mm')}`;
}

function CommentCard({ comment }: { comment: BitTicketComment }) {
  const isNote = comment.kind === 'note';
  return (
    <div
      className={cn(
        'rounded-xl border p-3.5',
        isNote ? 'border-warning/30 bg-warning/5' : 'border-border bg-card'
      )}
    >
      <div className="flex items-start gap-3">
        <UserAvatar name={comment.authorName} size="md" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold text-card-foreground">{comment.authorName}</span>
            {isNote && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
                <Lock size={11} />
                Internal note
              </span>
            )}
            <span className="text-xs text-muted-foreground">{timeLabel(comment.createdAt)}</span>
          </div>
          <p className="whitespace-pre-wrap break-words text-sm text-card-foreground">{comment.body}</p>
          <TicketAttachmentGallery attachments={comment.attachments} />
        </div>
      </div>
    </div>
  );
}

function EventRow({ event }: { event: BitTicketEvent }) {
  const Icon = EVENT_ICONS[event.eventType] ?? Pencil;
  return (
    <div className="flex items-center gap-2.5 px-1 text-xs text-muted-foreground">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon size={11} />
      </span>
      <span className="min-w-0 truncate">{eventText(event)}</span>
      <span className="ml-auto shrink-0 tabular-nums">{timeLabel(event.createdAt)}</span>
    </div>
  );
}

export function TicketActivity({ ticket }: { ticket: BitTicketDetail }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [filter, setFilter] = useState<Filter>('all');
  const [kind, setKind] = useState<CommentKind>('update');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<UploadedFileRef[]>([]);
  const [notifyManager, setNotifyManager] = useState(true);

  const items = useMemo<TimelineItem[]>(() => {
    const list: TimelineItem[] = [];
    if (filter !== 'history') {
      for (const c of ticket.comments) {
        if (filter === 'all' || c.kind === filter) {
          list.push({ type: 'comment', at: new Date(c.createdAt).getTime(), key: `c${c.id}`, comment: c });
        }
      }
    }
    if (filter === 'all' || filter === 'history') {
      for (const e of ticket.events) {
        list.push({ type: 'event', at: new Date(e.createdAt).getTime(), key: `e${e.id}`, event: e });
      }
    }
    return list.sort((a, b) => a.at - b.at);
  }, [ticket.comments, ticket.events, filter]);

  const send = useMutation({
    mutationFn: () => bitTicketApi.addComment(ticket.id, {
        kind,
        body: body.trim(),
        attachments,
        ...(ticket.onAirImpact && kind === 'update' ? { notifyManager } : {}),
      }),
    onSuccess: async () => {
      setBody('');
      setAttachments([]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bit-ticket', ticket.id] }),
        queryClient.invalidateQueries({ queryKey: ['bit-tickets'] }),
        queryClient.invalidateQueries({ queryKey: ['bit-ticket-summary'] }),
      ]);
      showToast(kind === 'note' ? 'Note added' : 'Update posted', 'success');
    },
    onError: (err) => showToast(getApiErrorMessage(err, 'Could not post comment'), 'error'),
  });

  const canSend = body.trim().length > 0 && !send.isPending;

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canSend) {
      e.preventDefault();
      send.mutate();
    }
  }

  return (
    <Card className="rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-card-foreground">Activity</h2>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter activity">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                filter === f.key
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nothing here yet.</p>
        ) : (
          items.map((item) =>
            item.type === 'comment' ? (
              <CommentCard key={item.key} comment={item.comment} />
            ) : (
              <EventRow key={item.key} event={item.event} />
            )
          )
        )}
      </div>

      <div className="mt-5 space-y-3 border-t border-border pt-4">
        <div role="radiogroup" aria-label="Comment type" className="inline-flex rounded-lg bg-muted p-1">
          {(['update', 'note'] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-all',
                kind === k ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {k === 'note' && <Lock size={12} />}
              {k === 'update' ? 'Update' : 'Internal note'}
            </button>
          ))}
        </div>

        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          aria-label={kind === 'note' ? 'Internal note' : 'Update'}
          placeholder={
            kind === 'note'
              ? 'Technical details or handover hints for the next shift…'
              : 'Share progress with the team…'
          }
          className={cn(kind === 'note' && 'border-warning/30 bg-warning/5')}
        />

        <MultiFileUploadField
          id="ticket-comment-attachments"
          label="Attachments"
          value={attachments}
          onChange={setAttachments}
          onUpload={bitTicketApi.upload}
          accept="image/*,.pdf,.log,.txt"
        />

        {ticket.onAirImpact && kind === 'update' && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-card-foreground">
            <Checkbox checked={notifyManager} onCheckedChange={(c) => setNotifyManager(c === true)} />
            Email this update to management
          </label>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">Ctrl/Cmd + Enter to send</span>
          <Button className="ml-auto" disabled={!canSend} onClick={() => send.mutate()}>
            {send.isPending ? <Loader2 className="animate-spin" /> : <Send />}
            {kind === 'note' ? 'Add note' : 'Post update'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
