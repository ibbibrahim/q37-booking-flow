import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { formatDateDisplay } from '../utils/dateUtils';
import type { RotaWeek } from '../types/rota';

export interface AutoRotateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWeek: RotaWeek | null;
  weekStart: Date;
  onConfirm: () => Promise<void>;
}

export function AutoRotateModal({
  open,
  onOpenChange,
  currentWeek,
  weekStart,
  onConfirm,
}: AutoRotateModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  const nextWeekEnd = new Date(nextWeekStart);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const assignmentCount = currentWeek?.assignments?.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Auto-Generate Next Week</DialogTitle>
          <DialogDescription>
            This will create next week&apos;s rota with automatic shift rotation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              All employees will be rotated: Morning → Evening → Night → Morning
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-4">
              <h4 className="font-medium mb-2">
                This Week ({formatDateDisplay(weekStart)} - {formatDateDisplay(weekEnd)})
              </h4>
              <p className="text-sm text-muted-foreground">
                {assignmentCount} assignments
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h4 className="font-medium mb-2">
                Next Week ({formatDateDisplay(nextWeekStart)} - {formatDateDisplay(nextWeekEnd)})
              </h4>
              <p className="text-sm text-muted-foreground">
                Rotated assignments will be generated
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Generate Next Week'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
