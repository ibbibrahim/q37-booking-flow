import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, MessageSquare, Paperclip, Send, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { listCreativeComments, postCreativeComment } from '../services/creativeApi';
import { useCreativeRequestThread } from '../hooks/useCreativeRequestThread';
import { CREATIVE_REQUEST_STATUS, type CreativeComment, type CreativeRequestTransition } from '../types/creative';

const AVATAR_COLORS = [
  'bg-orange-500', 'bg-sky-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500', 'bg-amber-500',
];

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

// Plain-English version of a status transition, spoken as a system line in the thread
// instead of a separate audit-log card.
function transitionText(t: CreativeRequestTransition): string {
  const who = t.changedByName || 'System';
  if (!t.fromStatus) return `${who} submitted this request`;
  // The backend writes claim events as a same-status transition (FromStatus === ToStatus) —
  // there's no real status change, just "someone picked this up".
  if (t.fromStatus === t.toStatus) return `${who} claimed and started working`;
  switch (t.toStatus) {
    case CREATIVE_REQUEST_STATUS.Completed:
      return `${who} delivered the result${t.comment ? `: ${t.comment}` : ''}`;
    case CREATIVE_REQUEST_STATUS.Approved:
      return `${who} approved the request`;
    case CREATIVE_REQUEST_STATUS.NeedsRevision:
      return `${who} requested changes${t.comment ? `: ${t.comment}` : ''}`;
    default:
      return `${who}: ${t.fromStatus} → ${t.toStatus}`;
  }
}

// Mirrors the status accent colors on the request card, so the timeline's dots read as the
// same visual language as the status badge above it.
function transitionDotColor(t: CreativeRequestTransition): string {
  if (t.fromStatus && t.fromStatus === t.toStatus) return 'bg-primary';
  switch (t.toStatus) {
    case CREATIVE_REQUEST_STATUS.Completed:
      return 'bg-blue-500';
    case CREATIVE_REQUEST_STATUS.Approved:
      return 'bg-green-500';
    case CREATIVE_REQUEST_STATUS.NeedsRevision:
      return 'bg-red-500';
    default:
      return 'bg-slate-400';
  }
}

function Avatar({ name, mine }: { name: string; mine: boolean }) {
  return (
    <div
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white shadow-sm ring-2 ring-background',
        mine ? 'bg-primary' : colorFor(name),
      )}
    >
      {initialsFor(name)}
    </div>
  );
}

type ThreadItem =
  | { kind: 'transition'; at: string; transition: CreativeRequestTransition }
  | { kind: 'comment'; at: string; comment: CreativeComment };

// Per-request chat thread: text + attachments, delivered live over the WorkflowHub's
// per-request room (JoinRequestThread/LeaveRequestThread) via useCreativeRequestThread —
// merged with the request's status-transition history so the whole handoff story reads as
// one timeline instead of a separate audit-log card plus a disconnected chat box.
export function CreativeCommentThread({
  requestId,
  transitions,
  requesterName,
  requesterUserId,
  requesterLabel,
  teamLabel,
}: {
  requestId: number;
  transitions: CreativeRequestTransition[];
  requesterName: string | null;
  requesterUserId: number | null;
  requesterLabel: string;
  teamLabel: string;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const queryKey = ['creative-comments', requestId];
  const { data: comments = [] } = useQuery({
    queryKey,
    queryFn: () => listCreativeComments(requestId),
  });

  useCreativeRequestThread(requestId, (comment) => {
    queryClient.setQueryData<CreativeComment[]>(queryKey, (prev) => {
      if (!prev) return [comment];
      if (prev.some((c) => c.id === comment.id)) return prev;
      return [...prev, comment];
    });
  });

  const items: ThreadItem[] = [
    ...transitions.map((t): ThreadItem => ({ kind: 'transition', at: t.changedAt, transition: t })),
    ...comments.map((c): ThreadItem => ({ kind: 'comment', at: c.createdAt, comment: c })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  // Opens already scrolled to the latest message (snap, no animation) instead of dropping
  // the viewer at the oldest one — then smooth-scrolls for anything that arrives afterwards.
  const hasScrolledInitially = useRef(false);
  useEffect(() => {
    if (!scrollRef.current || items.length === 0) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: hasScrolledInitially.current ? 'smooth' : 'auto',
    });
    hasScrolledInitially.current = true;
  }, [items.length]);

  async function handleSend() {
    const body = draft.trim();
    if (!body && files.length === 0) return;

    setSending(true);
    try {
      const created = await postCreativeComment(requestId, body || undefined, files);
      queryClient.setQueryData<CreativeComment[]>(queryKey, (prev) => {
        if (!prev) return [created];
        if (prev.some((c) => c.id === created.id)) return prev;
        return [...prev, created];
      });
      setDraft('');
      setFiles([]);
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-2.5">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          Request thread
        </CardTitle>
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 font-medium text-foreground">
            {requesterName || 'Requester'}
          </span>
          <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
            {teamLabel}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          ref={scrollRef}
          className="schedule-cell-scroll max-h-[28rem] min-h-[16rem] overflow-y-auto space-y-3 pr-3"
        >
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet. Start the conversation below.</p>
          ) : (
            items.map((item) => {
              if (item.kind === 'transition') {
                return (
                  <div key={`t-${item.transition.id}`} className="flex justify-center py-0.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/60 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
                      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', transitionDotColor(item.transition))} />
                      {transitionText(item.transition)}
                      <span className="text-muted-foreground/40">·</span>
                      {formatRelativeTime(item.at)}
                    </span>
                  </div>
                );
              }

              const c = item.comment;
              const isMine = c.authorUserId === user?.id;
              const name = c.authorName || 'Unknown';
              const roleLabel = c.authorUserId === requesterUserId ? requesterLabel : teamLabel;

              return (
                <div key={`c-${c.id}`} className={cn('flex items-start gap-2.5', isMine && 'justify-end')}>
                  {!isMine && <Avatar name={name} mine={false} />}
                  <div className={cn('flex max-w-[75%] flex-col gap-1', isMine && 'items-end')}>
                    <div className="flex items-center gap-1.5 px-0.5 text-xs">
                      <span className="font-semibold text-foreground">{isMine ? 'You' : name}</span>
                      <span className="text-muted-foreground/40">•</span>
                      <span className="text-muted-foreground">{roleLabel}</span>
                      <span className="text-muted-foreground/40">•</span>
                      <span className="text-muted-foreground/70">{formatRelativeTime(c.createdAt)}</span>
                    </div>
                    <div
                      className={cn(
                        'rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm',
                        isMine
                          ? 'rounded-tr-sm bg-primary text-primary-foreground'
                          : 'rounded-tl-sm bg-muted text-card-foreground',
                      )}
                    >
                      {c.body && <div className="whitespace-pre-wrap break-words">{c.body}</div>}
                      {c.attachments.length > 0 && (
                        <ul className={cn('space-y-1', c.body && 'mt-1.5')}>
                          {c.attachments.map((a) => (
                            <li key={a.id}>
                              <a
                                href={a.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  'flex items-center gap-1 underline underline-offset-2',
                                  !isMine && 'text-primary',
                                )}
                              >
                                <Paperclip className="h-3 w-3 shrink-0" />
                                {a.fileName}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  {isMine && <Avatar name="You" mine />}
                </div>
              );
            })
          )}
        </div>

        {files.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <li
                key={i}
                className="flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs shadow-sm"
              >
                <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
                {f.name}
                <button
                  type="button"
                  onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-end gap-1.5 rounded-2xl border border-border bg-background p-1.5 shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-ring/30">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) setFiles([...files, ...Array.from(e.target.files)]);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Message about this request…"
            rows={1}
            disabled={sending}
            className="max-h-32 flex-1 resize-none border-0 bg-transparent px-1 py-1.5 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button
            type="button"
            size="icon"
            className="shrink-0 rounded-full"
            onClick={handleSend}
            disabled={sending || (!draft.trim() && files.length === 0)}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
