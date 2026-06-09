import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface ListPaginationBarProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  /** Persist rows-per-page (and optionally page) under this key. */
  storageKey?: string;
  className?: string;
  disabled?: boolean;
}

const DEFAULT_PAGE_SIZES = [5, 10, 20, 50];

function readStoredPageSize(key: string | undefined, fallback: number): number {
  if (!key || typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(`${key}:pageSize`);
    if (!raw) return fallback;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  } catch {
    return fallback;
  }
}

function readStoredPage(key: string | undefined, fallback: number): number {
  if (!key || typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(`${key}:page`);
    if (!raw) return fallback;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  } catch {
    return fallback;
  }
}

/** Persist page size (and current page when storageKey is set) to localStorage. */
export function persistPaginationState(
  storageKey: string,
  page: number,
  pageSize: number
): void {
  try {
    localStorage.setItem(`${storageKey}:pageSize`, String(pageSize));
    localStorage.setItem(`${storageKey}:page`, String(page));
  } catch {
    /* ignore */
  }
}

export function getInitialPageSize(storageKey: string | undefined, defaultSize: number): number {
  return readStoredPageSize(storageKey, defaultSize);
}

export function getInitialPage(storageKey: string | undefined, defaultPage = 1): number {
  return readStoredPage(storageKey, defaultPage);
}

/**
 * Rows-per-page + range text + prev/next. Place above the table/list.
 * Optional `storageKey` keeps page and pageSize across navigations.
 */
export function ListPaginationBar({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  storageKey,
  className,
  disabled,
}: ListPaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1);
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(safePage * pageSize, totalItems);

  React.useEffect(() => {
    if (!storageKey) return;
    persistPaginationState(storageKey, safePage, pageSize);
  }, [storageKey, safePage, pageSize]);

  const navButtonClass =
    'inline-flex h-9 w-9 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/15 disabled:pointer-events-none disabled:opacity-40';

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg bg-primary/[0.07] px-3 py-2.5 dark:bg-primary/10',
        'sm:flex-row sm:items-center sm:justify-between',
        disabled && 'opacity-60',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-primary/90 whitespace-nowrap">
          Rows per page
        </label>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => onPageSizeChange(Number(v))}
          disabled={disabled}
        >
          <SelectTrigger className="h-9 w-[4.5rem] border-primary/30 bg-background font-semibold text-primary">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={disabled || safePage <= 1}
          className={navButtonClass}
          aria-label="Previous page"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="min-w-[7.5rem] text-center text-sm tabular-nums">
          {totalItems === 0 ? (
            <span className="font-semibold text-muted-foreground">0 of 0</span>
          ) : (
            <>
              <span className="font-semibold text-foreground">{startIndex}–{endIndex}</span>
              <span className="mx-1 text-muted-foreground">of</span>
              <span className="font-bold text-primary">{totalItems}</span>
            </>
          )}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={disabled || safePage >= totalPages}
          className={navButtonClass}
          aria-label="Next page"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
