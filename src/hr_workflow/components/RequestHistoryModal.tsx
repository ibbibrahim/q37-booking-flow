import { useQuery } from '@tanstack/react-query';
import { X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HistoryEvent {
  id: number;
  eventType: string;
  actorName: string | null;
  metadata: string | null;
  createdAt: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  queryKey: readonly unknown[];
  fetchEvents: () => Promise<HistoryEvent[]>;
  eventLabels?: Record<string, string>;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

/** Generic activity-log viewer for any append-only HR event trail (hiring
 * requests, leave requests) — same idea as ContractHistoryModal, just not
 * tied to one specific entity's event shape. */
export function RequestHistoryModal({ open, onClose, title, queryKey, fetchEvents, eventLabels }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: fetchEvents,
    enabled: open,
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="p-5 border-b border-border flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-foreground">History</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 h-8 w-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:bg-muted"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {isError && <p className="text-sm text-destructive">Failed to load history.</p>}

          {data && (
            <ul className="space-y-4">
              {data.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Clock size={15} />
                  </div>
                  <div className="min-w-0 text-sm">
                    <p className="font-medium text-foreground">{eventLabels?.[e.eventType] ?? e.eventType}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(e.createdAt)}
                      {e.actorName ? ` · ${e.actorName}` : ''}
                    </p>
                    {e.metadata && <p className="text-xs text-foreground/80 mt-0.5 italic">{e.metadata}</p>}
                  </div>
                </li>
              ))}
              {data.length === 0 && <p className="text-sm text-muted-foreground">No activity recorded yet.</p>}
            </ul>
          )}
        </div>

        <div className="p-4 border-t border-border">
          <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
