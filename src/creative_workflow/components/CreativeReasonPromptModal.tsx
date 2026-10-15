import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { DTL_DIALOG_CONTENT_CLASS, DTL_DIALOG_FOOTER_CLASS } from '../../dtl_workflow/components/dtlDialogStyles';

// Generic confirm-with-comment dialog for status changes / approve / unapprove.
// Mirrors dtl_workflow/components/DtlReasonPromptModal.tsx.
export function CreativeReasonPromptModal({
  open,
  title,
  confirmLabel,
  confirmVariant = 'default',
  commentRequired = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  confirmLabel: string;
  confirmVariant?: 'default' | 'destructive';
  commentRequired?: boolean;
  onConfirm: (comment: string) => Promise<void>;
  onClose: () => void;
}) {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    if (submitting) return;
    setComment('');
    setError(null);
    onClose();
  }

  async function handleConfirm() {
    const trimmed = comment.trim();
    if (commentRequired && !trimmed) {
      setError('A comment is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(trimmed);
      setComment('');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className={cn(DTL_DIALOG_CONTENT_CLASS, 'sm:max-w-[500px]')} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="creative-reason">{commentRequired ? 'Comment (required)' : 'Add a note (optional)'}</Label>
          <Textarea
            id="creative-reason"
            autoFocus
            placeholder="Add a comment…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            disabled={submitting}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className={DTL_DIALOG_FOOTER_CLASS}>
          <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" variant={confirmVariant} onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Saving…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
