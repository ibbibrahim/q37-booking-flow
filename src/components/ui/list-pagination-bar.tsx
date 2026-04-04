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

  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page:</span>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => onPageSizeChange(Number(v))}
          disabled={disabled}
        >
          <SelectTrigger className="w-[88px] h-9">
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

      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground tabular-nums">
          {totalItems === 0 ? '0 of 0' : `${startIndex}–${endIndex} of ${totalItems}`}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(safePage - 1)}
            disabled={disabled || safePage <= 1}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-card-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(safePage + 1)}
            disabled={disabled || safePage >= totalPages}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-card-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
