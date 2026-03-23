import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { rotaApi } from '../api/rotaApi';
import { formatWeekRange } from '../utils/rotaUtils';
import { formatDateForApi } from '../utils/dateUtils';
import { useToast } from '@/contexts/ToastContext';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface CopyWeekModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWeekStart: Date;
  currentWeekId: number | undefined;
  departmentId: number | null;
  onSuccess: () => void;
}

export function CopyWeekModal({
  open,
  onOpenChange,
  currentWeekStart,
  currentWeekId,
  departmentId,
  onSuccess,
}: CopyWeekModalProps) {
  const { showToast } = useToast();
  const [sourceWeekStart, setSourceWeekStart] = useState<Date>(() => {
    const d = new Date(currentWeekStart);
    d.setTime(d.getTime() - WEEK_MS);
    return d;
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const d = new Date(currentWeekStart);
      d.setTime(d.getTime() - WEEK_MS);
      setSourceWeekStart(d);
    }
  }, [open, currentWeekStart]);

  const { data: sourceWeek, isLoading: isLoadingSource, error: sourceError } = useQuery({
    queryKey: ['rotaWeek', formatDateForApi(sourceWeekStart), departmentId],
    queryFn: () =>
      rotaApi.getWeek(formatDateForApi(sourceWeekStart), departmentId!),
    enabled: open && !!departmentId,
  });

  const goToPreviousWeek = () => {
    setSourceWeekStart((prev) => new Date(prev.getTime() - WEEK_MS));
  };

  const goToNextWeek = () => {
    setSourceWeekStart((prev) => new Date(prev.getTime() + WEEK_MS));
  };

  const handleCopy = async () => {
    if (!currentWeekId || !sourceWeek) return;
    setIsLoading(true);
    try {
      await rotaApi.copyFromWeek(currentWeekId, sourceWeek.id);
      const count = sourceWeek.assignments.length;
      showToast(`Copied ${count} assignment${count !== 1 ? 's' : ''} from ${formatWeekRange(sourceWeekStart)}`, 'success');
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string }; status?: number } };
      const message = axiosErr?.response?.data?.message;
      const status = axiosErr?.response?.status;

      if (status === 404 || message?.toLowerCase().includes('not found')) {
        showToast('Source week not found', 'error');
      } else if (message?.toLowerCase().includes('department')) {
        showToast('Cannot copy between different departments', 'error');
      } else if (status === 403 || message?.toLowerCase().includes('permission')) {
        showToast("You don't have permission to access that week", 'error');
      } else {
        showToast('Failed to copy week. Please try again.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const canCopy = !isLoading && !!sourceWeek && sourceWeek.assignments.length > 0;
  const isNextDisabled = sourceWeekStart.getTime() >= currentWeekStart.getTime();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy Week Assignments</DialogTitle>
          <DialogDescription>
            Copy all assignments from another week to current week
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Copy From Week</Label>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                ← Previous
              </Button>
              <div className="flex-1 text-center py-2 border rounded bg-muted/30">
                {formatWeekRange(sourceWeekStart)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextWeek}
                disabled={isNextDisabled}
              >
                Next →
              </Button>
            </div>
          </div>

          {isLoadingSource ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Loading source week...
            </div>
          ) : sourceError ? (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to load source week. It may not exist or you may not have access.
              </AlertDescription>
            </Alert>
          ) : sourceWeek ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>{sourceWeek.assignments.length} assignments</strong> will be copied to{' '}
                <strong>{formatWeekRange(currentWeekStart)}</strong>
                {sourceWeek.assignments.length === 0 && (
                  <p className="text-amber-600 mt-1">⚠️ Source week has no assignments</p>
                )}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCopy}
            disabled={!canCopy}
          >
            {isLoading ? 'Copying...' : 'Copy Assignments'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
