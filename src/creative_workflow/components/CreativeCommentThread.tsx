import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Paperclip, Send, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { listCreativeComments, postCreativeComment } from '../services/creativeApi';
import { useCreativeRequestThread } from '../hooks/useCreativeRequestThread';
import type { CreativeComment } from '../types/creative';

// Per-request chat thread: text + attachments, delivered live over the WorkflowHub's
// per-request room (JoinRequestThread/LeaveRequestThread) via useCreativeRequestThread.
export function CreativeCommentThread({ requestId }: { requestId: number }) {
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

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [comments.length]);

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
      <CardHeader>
        <CardTitle className="text-base">Discussion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div ref={scrollRef} className="max-h-96 overflow-y-auto space-y-3 pr-1">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet. Start the conversation below.</p>
          ) : (
            comments.map((c) => {
              const isMine = c.authorUserId === user?.id;
              return (
                <div key={c.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      isMine ? 'bg-primary text-primary-foreground' : 'bg-muted text-card-foreground'
                    }`}
                  >
                    {!isMine && <div className="text-xs font-semibold opacity-80">{c.authorName || 'Unknown'}</div>}
                    {c.body && <div className="whitespace-pre-wrap break-words">{c.body}</div>}
                    {c.attachments.length > 0 && (
                      <ul className="mt-1 space-y-1">
                        {c.attachments.map((a) => (
                          <li key={a.id}>
                            <a
                              href={a.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-1 underline ${isMine ? '' : 'text-primary'}`}
                            >
                              <Paperclip className="h-3 w-3 shrink-0" />
                              {a.fileName}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className={`mt-1 text-[10px] ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {new Date(c.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {files.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <li key={i} className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs">
                {f.name}
                <button type="button" onClick={() => setFiles(files.filter((_, idx) => idx !== i))}>
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-end gap-2">
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
          <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={sending}>
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
            placeholder="Write a message…"
            rows={2}
            disabled={sending}
            className="flex-1"
          />
          <Button type="button" onClick={handleSend} disabled={sending || (!draft.trim() && files.length === 0)}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
