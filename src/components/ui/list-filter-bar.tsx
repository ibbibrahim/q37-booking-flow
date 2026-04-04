import * as React from 'react';
import { Filter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ListFilterBarProps {
  title?: string;
  children: React.ReactNode;
  /** Shown below the main controls when provided (e.g. chips + Clear All). */
  activeFiltersRow?: React.ReactNode;
  className?: string;
}

/**
 * Shared filter shell: card, “Filters” header, main controls, optional active-filters row.
 * Used by booking list and callsheet analytics.
 */
export function ListFilterBar({
  title = 'Filters',
  children,
  activeFiltersRow,
  className,
}: ListFilterBarProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-muted-foreground" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        {activeFiltersRow}
      </CardContent>
    </Card>
  );
}

export interface FilterActiveFiltersRowProps {
  children: React.ReactNode;
  onClearAll?: () => void;
  clearAllLabel?: string;
  className?: string;
}

/** “Active filters:” row with optional Clear All (aligned with chips). */
export function FilterActiveFiltersRow({
  children,
  onClearAll,
  clearAllLabel = 'Clear All',
  className,
}: FilterActiveFiltersRowProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-sm text-muted-foreground">Active filters:</span>
      {children}
      {onClearAll && (
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onClearAll} type="button">
          {clearAllLabel}
        </Button>
      )}
    </div>
  );
}
