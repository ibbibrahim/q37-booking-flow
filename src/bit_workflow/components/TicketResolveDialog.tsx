import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface TicketResolveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketNo: string;
  submitting: boolean;
  onConfirm: (resolutionSummary: string) => void;
}

export function TicketResolveDialog({ open, onOpenChange, ticketNo, submitting, onConfirm }: TicketResolveDialogProps) {
  const [summary, setSummary] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSummary('');
      setError(null);
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!summary.trim()) {
      setError('A resolution summary is required');
      return;
    }
    onConfirm(summary.trim());
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Resolve {ticketNo}</DialogTitle>
          <DialogDescription>Summarise what fixed the issue so the team can learn from it.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="resolution-summary">Resolution summary *</Label>
            <Textarea
              id="resolution-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={5}
              autoFocus
              aria-invalid={!!error}
              placeholder="Root cause and the fix applied"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Resolve ticket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
