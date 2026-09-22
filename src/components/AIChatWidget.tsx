import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Minimize2, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '@/lib/utils';
import botImg from '../assets/bot.png';

// Proxied through Vite — avoids HTTPS→HTTP mixed-content block
const AI_API_URL = '/ai-api/chat/';
const AI_API_KEY = 'qbc-internal-bit-2024';

const FALLBACK_ANSWER =
  "I don't know that yet, but I'm still learning — I'll improve myself over time.";

interface Message {
  id: number;
  role: 'user' | 'bot';
  text: string;
  sources?: string[];
  isRtl?: boolean;
}

let msgIdCounter = 0;
const nextId = () => ++msgIdCounter;

function isArabic(text: string) {
  return /[؀-ۿ]/.test(text);
}

function BotIcon({ size = 22, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <line x1="12" y1="7" x2="12" y2="11" />
      <line x1="8" y1="15" x2="8" y2="15" strokeWidth={3} />
      <line x1="12" y1="15" x2="12" y2="15" strokeWidth={3} />
      <line x1="16" y1="15" x2="16" y2="15" strokeWidth={3} />
    </svg>
  );
}

export const AIChatWidget: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNotif, setShowNotif] = useState(true);
  const [available, setAvailable] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Bumped on close so in-flight replies from a previous session are discarded
  const sessionRef = useRef(0);

  // Health check on page load — only show the bot if the AI server is reachable.
  // Any response below 500 means the server answered; 5xx is the proxy reporting
  // an unreachable backend.
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    fetch(AI_API_URL, {
      method: 'GET',
      headers: { 'X-API-Key': AI_API_KEY },
      signal: controller.signal,
    })
      .then(res => {
        if (res.status < 500) setAvailable(true);
      })
      .catch(() => {
        /* unreachable — widget stays hidden */
      })
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (open && !minimized) scrollToBottom();
  }, [messages, open, minimized]);

  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open, minimized]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const session = sessionRef.current;
    setInput('');
    setShowNotif(false);

    const userMsg: Message = {
      id: nextId(),
      role: 'user',
      text: trimmed,
      isRtl: isArabic(trimmed),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch(AI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': AI_API_KEY,
        },
        body: JSON.stringify({
          message: trimmed,
          username: user?.username ?? 'anonymous',
        }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      if (sessionRef.current !== session) return;
      const answer =
        typeof data.answer === 'string' && data.answer.trim()
          ? data.answer
          : FALLBACK_ANSWER;

      setMessages(prev => [
        ...prev,
        {
          id: nextId(),
          role: 'bot',
          text: answer,
          sources: data.sources ?? [],
          isRtl: isArabic(answer),
        },
      ]);
    } catch (err) {
      if (sessionRef.current !== session) return;
      setMessages(prev => [
        ...prev,
        {
          id: nextId(),
          role: 'bot',
          text: `Sorry, I couldn't reach the AI server. Please try again later`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, user]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setMinimized(false);
    setShowNotif(false);
  };

  const handleClose = () => {
    sessionRef.current++;
    setOpen(false);
    setMinimized(false);
    setMessages([]);
    setInput('');
    setLoading(false);
  };

  if (!available) return null;

  return (
    <>
      {/* ── Floating Button ── */}
      <button
        onClick={open && !minimized ? handleClose : handleOpen}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'w-14 h-14 rounded-full',
          'flex items-center justify-center',
          'shadow-lg transition-all duration-200',
          'bg-primary text-primary-foreground',
          'hover:scale-110 hover:shadow-xl',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        )}
        aria-label="Toggle QBC Assistant"
      >
        {open && !minimized ? (
          <X size={22} />
        ) : (
          <>
            <BotIcon size={24} />
            {showNotif && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive border-2 border-background animate-pulse" />
            )}
          </>
        )}
      </button>

      {/* ── Chat Window ── */}
      <div
        className={cn(
          'fixed bottom-24 right-6 z-50',
          'w-[380px] flex flex-col',
          'bg-card border border-border rounded-xl shadow-2xl',
          'transition-all duration-300 origin-bottom-right',
          open && !minimized
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-90 pointer-events-none',
        )}
        style={{ height: '640px' }}
        role="dialog"
        aria-label="QBC Assistant"
      >

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card rounded-t-xl shrink-0">
          <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0">
            <img src={botImg} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-card-foreground leading-tight">QBC Assistant</p>
            <p className="text-xs text-muted-foreground truncate">
              {user ? `${user.username} · Internal Knowledge Base` : 'Internal Knowledge Base'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMinimized(true)}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-card-foreground transition-colors"
              aria-label="Minimize"
            >
              <Minimize2 size={14} />
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-card-foreground transition-colors"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Messages — fills all remaining space */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">

          {/* Empty state — centered greeting */}
          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-6">
              <img src={botImg} alt="" className="w-14 h-14 rounded-full object-cover" />
              <p className="text-base font-medium text-card-foreground">How may I help you?</p>
              <p className="text-sm text-muted-foreground" dir="rtl">
                كيف يمكنني مساعدتك؟
              </p>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={cn('flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start')}>
              <div
                className={cn(
                  'max-w-[86%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-card-foreground rounded-bl-sm border border-border',
                  msg.isRtl && 'text-right',
                )}
                dir={msg.isRtl ? 'rtl' : 'ltr'}
                style={msg.isRtl ? { fontFamily: 'Arial, sans-serif' } : undefined}
              >
                <span className="whitespace-pre-wrap">{msg.text}</span>

                {/* Source chips */}
                {/* {msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {msg.sources.map(s => (
                      <span
                        key={s}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20"
                      >
                        📄 {s}
                      </span>
                    ))}
                  </div>
                )} */}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex items-start">
              <div className="bg-muted border border-border rounded-2xl rounded-bl-sm px-3 py-2.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t border-border px-3 py-2.5 flex items-end gap-2 bg-card">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask in English / اسأل بالعربي"
            rows={1}
            disabled={loading}
            className={cn(
              'flex-1 resize-none bg-input border border-border rounded-lg',
              'px-3 py-2 text-sm text-card-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-1 focus:ring-ring',
              'min-h-[40px] max-h-[110px] transition-colors',
              'disabled:opacity-50',
            )}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mb-0.5',
              'bg-primary text-primary-foreground',
              'hover:opacity-90 transition-opacity',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'focus:outline-none focus:ring-2 focus:ring-ring',
            )}
            aria-label="Send"
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
          </button>
        </div>

        {/* Footer bar */}
        <div className="shrink-0 text-center text-[10px] text-muted-foreground py-1.5 border-t border-border bg-muted/20 rounded-b-xl">
          All answers are AI generated. QBC Assistant can make mistakes — check important info.
        </div>
      </div>
    </>
  );
};
