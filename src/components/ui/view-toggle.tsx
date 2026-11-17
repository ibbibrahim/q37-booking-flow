import { Columns3, List } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewToggleValue = 'list' | 'grid';

interface ViewToggleProps {
  value: ViewToggleValue;
  onChange: (value: ViewToggleValue) => void;
  className?: string;
}

const BASE = 'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors';
const ACTIVE = 'bg-background text-foreground shadow-sm';
const INACTIVE = 'text-muted-foreground hover:text-foreground';

/** Segmented Table / Board switch shared by list pages. */
export function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="View"
      className={cn('inline-flex items-center rounded-lg border border-border bg-muted/60 p-0.5', className)}
    >
      <button
        type="button"
        aria-pressed={value === 'list'}
        onClick={() => onChange('list')}
        className={cn(BASE, value === 'list' ? ACTIVE : INACTIVE)}
      >
        <List className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Table</span>
      </button>
      <button
        type="button"
        aria-pressed={value === 'grid'}
        onClick={() => onChange('grid')}
        className={cn(BASE, value === 'grid' ? ACTIVE : INACTIVE)}
      >
        <Columns3 className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Board</span>
      </button>
    </div>
  );
}
