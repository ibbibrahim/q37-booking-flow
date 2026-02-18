import React, { useState } from 'react';
import { XCircle, AlertTriangle } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { callSheetApi } from '../services/mockCallSheetApi';
import type { CallSheetRequest } from '../types/callsheet';

interface CancelCallSheetModalProps {
  open: boolean;
  onClose: () => void;
  callSheet: CallSheetRequest;
  onSuccess: (updatedCallSheet: CallSheetRequest) => void;
}

export const CancelCallSheetModal: React.FC<CancelCallSheetModalProps> = ({
  open,
  onClose,
  callSheet,
  onSuccess,
}) => {
  const [cancellationReason, setCancellationReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReasonValid = cancellationReason.trim().length >= 10;

  const handleSubmit = async () => {
    if (!isReasonValid) {
      setError('Cancellation reason must be at least 10 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updatedCallSheet = await callSheetApi.cancelCallSheet(
        callSheet.id,
        cancellationReason.trim()
      );
      onSuccess(updatedCallSheet);
      setCancellationReason('');
    } catch (err) {
      console.error('Failed to cancel call sheet:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel call sheet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setCancellationReason('');
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <XCircle className="h-5 w-5 text-destructive" />
            Cancel Call Sheet
          </DialogTitle>
          <DialogDescription>
            Cancel "{callSheet.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-destructive mb-1">Warning: This action cannot be undone</p>
              <p className="text-muted-foreground">
                Cancelling this call sheet will mark it as cancelled and notify all relevant parties.
                {callSheet.alreadyAnnouncedEmail && ' An email notification will be sent to all recipients.'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancellation-reason">
              Cancellation Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="cancellation-reason"
              placeholder="Please provide a detailed reason for cancellation (minimum 10 characters)..."
              value={cancellationReason}
              onChange={(e) => {
                setCancellationReason(e.target.value);
                setError(null);
              }}
              rows={4}
              className={error ? 'border-destructive' : ''}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              {cancellationReason.length} / 10 characters minimum
            </p>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleSubmit}
            disabled={!isReasonValid || loading}
          >
            {loading ? 'Cancelling...' : 'Confirm Cancellation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
