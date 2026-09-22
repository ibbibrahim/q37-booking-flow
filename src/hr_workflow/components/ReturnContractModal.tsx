import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  loading?: boolean;
  onConfirm: (reason: string) => void;
}

/** Reason-entry + confirmation in one step, shared by the single-row and
 * bulk "Return" flows on both Manager Approval and Final Approvals — a
 * reason is mandatory (no blank/vague returns), and clicking the button
 * inside this dialog IS the confirmation step, same pattern as
 * ConfirmActionModal elsewhere in this module. */
export function ReturnContractModal({ open, onOpenChange, title, description, loading, onConfirm }: Props) {
  const [reason, setReason] = useState('');

  const handleOpenChange = (next: boolean) => {
    if (!next) setReason('');
    onOpenChange(next);
  };

  const trimmed = reason.trim();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Reason for returning <span className="text-destructive">*</span>
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Incorrect salary amount, wrong department listed…"
            rows={3}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">Required — this is recorded on the contract's audit trail.</p>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => onConfirm(trimmed)} disabled={loading || trimmed.length === 0}>
            {loading ? 'Returning…' : 'Return'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
