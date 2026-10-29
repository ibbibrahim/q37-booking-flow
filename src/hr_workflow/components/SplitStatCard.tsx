import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SplitStatRow {
  label: string;
  value: number;
  icon: LucideIcon;
  accentClassName?: string;
  /** Route to navigate to when this row is clicked — only set this for rows
   * backed by real data with an actual page to show; omit it for dummy/
   * placeholder rows so they don't look actionable when there's nothing to
   * drill into yet. */
  to?: string;
}

interface SplitStatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  hint?: string;
  accentClassName?: string;
  rows: SplitStatRow[];
}

/** One headline stat on the left (icon + big number), a vertical divider,
 * then a compact breakdown stacked on the right — used for "Total X, broken
 * down by Permanent/Freelance" cards instead of three separate tiles. Any
 * row with a `to` target is clickable and navigates there. */
export function SplitStatCard({ label, value, icon: Icon, hint, accentClassName, rows }: SplitStatCardProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent className="p-5 flex items-stretch gap-5">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={cn('h-10 w-10 shrink-0 rounded-lg flex items-center justify-center bg-primary/10 text-primary', accentClassName)}>
            <Icon size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-2xl font-bold text-card-foreground mt-1 tabular-nums">{value}</p>
            {hint && <p className="text-[11px] text-muted-foreground mt-1 truncate">{hint}</p>}
          </div>
        </div>

        <div className="w-px bg-border shrink-0" />

        <div className="flex-1 flex flex-col justify-center gap-1 min-w-0 -my-1.5">
          {rows.map((row) => {
            const clickable = !!row.to;
            const content = (
              <>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                  <row.icon size={13} className={cn('shrink-0 text-primary', row.accentClassName)} />
                  <span className="truncate">{row.label}</span>
                </span>
                <span className="text-sm font-bold text-card-foreground tabular-nums shrink-0">{row.value}</span>
              </>
            );
            return clickable ? (
              <button
                key={row.label}
                type="button"
                onClick={() => navigate(row.to!)}
                className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1.5 -mx-1.5 text-left transition-colors hover:bg-muted"
              >
                {content}
              </button>
            ) : (
              <div key={row.label} className="flex items-center justify-between gap-2 px-1.5 py-1.5">
                {content}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
