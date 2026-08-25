import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

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

export function DetailField({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">{label}</dt>
      <dd className="text-sm font-medium text-card-foreground">{value}</dd>
    </div>
  );
}
