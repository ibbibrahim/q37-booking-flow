import type { ReactNode } from 'react';
import { AlertTriangle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DetailSectionProps {
  icon: LucideIcon;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** Card-with-header-bar shell used across the app's detail pages (see EditingRequestDetail). */
export function DetailSection({ icon: Icon, title, actions, children }: DetailSectionProps) {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
      <div className="flex items-center justify-between gap-2 px-6 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-base font-semibold text-card-foreground">{title}</h2>
        </div>
        {actions}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export function DetailFieldGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">{children}</dl>;
}

/**
 * `important` marks a field whose absence actually matters for the record
 * to be considered complete (contact info, identification, payroll bank
 * details, etc.) — those get a visible red "Missing" treatment instead of
 * silently disappearing. Non-important empty fields still show, just muted,
 * so the page reads as "here's everything we have" rather than hiding gaps.
 */
export function DetailField({ label, value, important }: { label: string; value: ReactNode; important?: boolean }) {
  const isEmpty = value === null || value === undefined || value === '';

  if (isEmpty && important) {
    return (
      <div>
        <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">{label}</dt>
        <dd>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
            <AlertTriangle size={12} /> Missing
          </span>
        </dd>
      </div>
    );
  }

  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">{label}</dt>
      <dd className={cn('text-sm font-medium', isEmpty ? 'text-muted-foreground font-normal' : 'text-card-foreground')}>
        {isEmpty ? 'Not provided' : value}
      </dd>
    </div>
  );
}
