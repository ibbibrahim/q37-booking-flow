import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { HiringStageStepper } from './HiringStageStepper';
import { departmentName } from '../data/departments';
import { formatDate, hiringStageBadgeClass } from '../utils/hrUtils';
import type { HiringRequest, HiringRequestStage } from '../types/hr';

interface Props {
  request: HiringRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdvance: (id: number, nextStage: HiringRequestStage, comment: string, by: string) => void;
  onReturn: (id: number, comment: string) => void;
}

const NEXT_STAGE: Partial<Record<HiringRequestStage, { stage: HiringRequestStage; actor: string; label: string }>> = {
  'Department Head': { stage: 'Elina Review', actor: 'Elina (HR Coordinator)', label: 'Submit to Elina' },
  'Elina Review': { stage: 'GM Approval', actor: 'Elina (HR Coordinator)', label: 'Forward to GM' },
  'GM Approval': { stage: 'QMC HR', actor: 'General Manager', label: 'Approve — Forward to QMC HR' },
  'QMC HR': { stage: 'CEO Approval', actor: 'QMC HR', label: 'Forward to CEO' },
  'CEO Approval': { stage: 'Completed', actor: 'CEO Office', label: 'Approve & Complete' },
  'Returned to Department': { stage: 'Elina Review', actor: 'Department Head', label: 'Resubmit to Elina' },
};

export function HiringRequestDetailModal({ request, open, onOpenChange, onAdvance, onReturn }: Props) {
  const [comment, setComment] = useState('');

  if (!request) return null;

  const nextAction = NEXT_STAGE[request.stage];
  const canReturn = request.stage === 'Elina Review';

  const handleAdvance = () => {
    if (!nextAction) return;
    onAdvance(request.id, nextAction.stage, comment.trim(), nextAction.actor);
    setComment('');
  };

  const handleReturn = () => {
    onReturn(request.id, comment.trim() || 'Returned to Department Head — please review and resubmit.');
    setComment('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{request.requestNumber}</DialogTitle>
            <Badge className={hiringStageBadgeClass(request.stage)}>{request.status}</Badge>
          </div>
          <DialogDescription>
            {request.candidateName} · {request.jobTitle} · {departmentName(request.departmentId)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <HiringStageStepper stage={request.stage} />

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-muted/40 rounded-lg p-3">
            <span className="text-muted-foreground">Initiated By</span>
            <span className="text-right font-medium">{request.initiatedBy}</span>
            <span className="text-muted-foreground">Created</span>
            <span className="text-right font-medium">{formatDate(request.createdDate)}</span>
            <span className="text-muted-foreground">QID Status</span>
            <span className="text-right font-medium">{request.qidStatus}</span>
            <span className="text-muted-foreground">Type</span>
            <span className="text-right font-medium">{request.isInternal ? 'Internal' : 'External'}</span>
            <span className="text-muted-foreground">Duration</span>
            <span className="text-right font-medium">{request.duration}</span>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Comments & History
            </h4>
            <ol className="space-y-3 border-l border-border pl-4 max-h-52 overflow-y-auto">
              {request.comments.map((c) => (
                <li key={c.id} className="relative">
                  <span className="absolute -left-[1.1rem] top-1 h-2 w-2 rounded-full bg-primary" />
                  <p className="text-sm font-medium text-foreground">{c.by}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(c.date)} · {c.text}</p>
                </li>
              ))}
            </ol>
          </div>

          {(nextAction || canReturn) && request.stage !== 'Completed' && (
            <div className="space-y-2">
              <Textarea
                placeholder="Add a comment (optional)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
              />
            </div>
          )}
        </div>

        {request.stage !== 'Completed' && (
          <DialogFooter className="gap-2">
            {canReturn && (
              <Button variant="outline" className="text-destructive" onClick={handleReturn}>
                <RotateCcw size={14} className="mr-1" /> Return to Department
              </Button>
            )}
            {nextAction && (
              <Button onClick={handleAdvance}>
                {nextAction.label} <ArrowRight size={14} className="ml-1" />
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
