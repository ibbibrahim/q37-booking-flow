import type { KeyboardEvent, ReactNode } from 'react';
import { ChevronDown, ChevronsUp, ChevronUp, Equal, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TONE_DOT, type Tone } from '@/lib/tone';
import { Button } from '@/components/ui/button';

/** Horizontal scroller holding the board columns. */
export function StatusBoard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex snap-x gap-4 overflow-x-auto pb-2', className)}>{children}</div>;
}

interface BoardColumnProps {
  title: string;
  tone: Tone;
  count?: number;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyLabel?: string;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  children?: ReactNode;
  className?: string;
}

export function BoardColumn({
  title,
  tone,
  count,
  isLoading,
  isEmpty,
  emptyLabel = 'No items',
  hasMore,
  isLoadingMore,
  onLoadMore,
  children,
  className,
}: BoardColumnProps) {
  return (
    <section
      className={cn(
        'flex min-w-[280px] flex-1 snap-start flex-col rounded-xl border border-border/60 bg-muted/40',
        className,
      )}
    >
      <header className="sticky top-0 flex items-center gap-2 rounded-t-xl border-b border-border/60 px-3 py-2.5">
        <span className={cn('h-2 w-2 rounded-full', TONE_DOT[tone])} aria-hidden />
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        <span className="ml-auto rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-semibold tabular-nums text-foreground/80">
          {isLoading || count === undefined ? '–' : count}
        </span>
      </header>
      <div className="flex max-h-[calc(100vh-340px)] min-h-[120px] flex-col gap-2 overflow-y-auto p-2">
        {isLoading ? (
          <>
            <BoardCardSkeleton />
            <BoardCardSkeleton />
            <BoardCardSkeleton />
          </>
        ) : isEmpty ? (
          <div className="rounded-lg border border-dashed border-border/70 py-8 text-center text-xs text-muted-foreground">
            {emptyLabel}
          </div>
        ) : (
          children
        )}
        {!isLoading && hasMore && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden />
                Loading…
              </>
            ) : (
              'Load more'
            )}
          </Button>
        )}
      </div>
    </section>
  );
}

interface BoardCardProps {
  onClick?: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  chips?: ReactNode;
  footerKey?: ReactNode;
  footerLeft?: ReactNode;
  footerRight?: ReactNode;
  dimmed?: boolean;
  highlight?: boolean;
  /** Rendered top-right, next to the title (e.g. a NEW pill). */
  badge?: ReactNode;
}

export function BoardCard({
  onClick,
  title,
  subtitle,
  chips,
  footerKey,
  footerLeft,
  footerRight,
  dimmed,
  highlight,
  badge,
}: BoardCardProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };
  const hasFooter = footerKey || footerLeft || footerRight;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'group w-full cursor-pointer rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md',
        dimmed && 'opacity-60',
        highlight && 'ring-1 ring-primary/30',
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{title}</p>
          {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
      {chips && <div className="mt-2 flex flex-wrap items-center gap-1.5">{chips}</div>}
      {hasFooter && (
        <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-2.5">
          {footerKey && <span className="font-mono text-[11px] text-muted-foreground">{footerKey}</span>}
          {footerLeft}
          {footerRight && <div className="ml-auto flex items-center gap-2">{footerRight}</div>}
        </div>
      )}
    </div>
  );
}

export function BoardCardSkeleton() {
  return (
    <div className="w-full animate-pulse rounded-lg border border-border bg-card p-3 shadow-sm" aria-hidden>
      <div className="h-3.5 w-3/4 rounded bg-muted" />
      <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
      <div className="mt-3 h-4 w-24 rounded-full bg-muted" />
      <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-2.5">
        <div className="h-3 w-10 rounded bg-muted" />
        <div className="ml-auto h-5 w-5 rounded-full bg-muted" />
      </div>
    </div>
  );
}

const PRIORITY_ICON = {
  urgent: { Icon: ChevronsUp, color: 'text-red-500' },
  high: { Icon: ChevronUp, color: 'text-amber-500' },
  normal: { Icon: Equal, color: 'text-muted-foreground' },
  low: { Icon: ChevronDown, color: 'text-sky-500' },
} as const;

export function BoardPriorityIcon({
  level,
  className,
}: {
  level: 'urgent' | 'high' | 'normal' | 'low';
  className?: string;
}) {
  const { Icon, color } = PRIORITY_ICON[level];
  const label = level.charAt(0).toUpperCase() + level.slice(1);
  return (
    <span title={label} aria-label={label} className="inline-flex">
      <Icon className={cn('h-4 w-4', color, className)} aria-hidden />
    </span>
  );
}
