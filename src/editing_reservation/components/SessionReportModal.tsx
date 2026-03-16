import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/contexts/ToastContext';
import { editingApi } from '../api/editingApi';
import {
  parseTime,
  calculateEndTime,
  formatTimeSpan,
  formatDate,
  formatDateTime,
} from '../utils/editingUtils';
import type { EditingSession, EditingRequest, SubmitSessionReportDto } from '../types/editing';

interface SessionReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: EditingSession;
  request: EditingRequest;
  mode: 'submit' | 'view';
  onSuccess: () => void;
}

/** Convert HH:mm to HH:mm:ss for backend */
const toTimeSpan = (hhmm: string): string => {
  if (!hhmm) return '00:00:00';
  const parts = hhmm.split(':');
  return `${parts[0] ?? '00'}:${parts[1] ?? '00'}:00`;
};

export const SessionReportModal: React.FC<SessionReportModalProps> = ({
  open,
  onOpenChange,
  session,
  request,
  mode,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const defaultStart = parseTime(session.availableDatetime);
  const defaultEnd = session.availableDatetime && session.sessionDurationMinutes
    ? calculateEndTime(session.availableDatetime, session.sessionDurationMinutes)
    : '';

  const [actualStartTime, setActualStartTime] = useState(defaultStart);
  const [actualEndTime, setActualEndTime] = useState(defaultEnd);
  const [workCompletedPercentage, setWorkCompletedPercentage] = useState(
    session.workCompletedPercentage ?? 100
  );
  const [workDescription, setWorkDescription] = useState(session.workDescription ?? '');
  const [hadDelay, setHadDelay] = useState(session.hadDelay ?? false);
  const [delayReason, setDelayReason] = useState(session.delayReason ?? '');
  const [hadTechnicalIssues, setHadTechnicalIssues] = useState(session.hadTechnicalIssues ?? false);
  const [technicalIssueDescription, setTechnicalIssueDescription] = useState(
    session.technicalIssueDescription ?? ''
  );
  const [sessionComments, setSessionComments] = useState(session.sessionComments ?? '');

  useEffect(() => {
    if (open && !session.reportSubmittedAt) {
      setActualStartTime(parseTime(session.availableDatetime));
      setActualEndTime(
        session.availableDatetime && session.sessionDurationMinutes
          ? calculateEndTime(session.availableDatetime, session.sessionDurationMinutes)
          : ''
      );
      setWorkCompletedPercentage(session.workCompletedPercentage ?? 100);
      setWorkDescription(session.workDescription ?? '');
      setHadDelay(session.hadDelay ?? false);
      setDelayReason(session.delayReason ?? '');
      setHadTechnicalIssues(session.hadTechnicalIssues ?? false);
      setTechnicalIssueDescription(session.technicalIssueDescription ?? '');
      setSessionComments(session.sessionComments ?? '');
    }
  }, [open, session]);

  const resetForm = () => {
    setActualStartTime(defaultStart);
    setActualEndTime(defaultEnd);
    setWorkCompletedPercentage(session.workCompletedPercentage ?? 100);
    setWorkDescription(session.workDescription ?? '');
    setHadDelay(session.hadDelay ?? false);
    setDelayReason(session.delayReason ?? '');
    setHadTechnicalIssues(session.hadTechnicalIssues ?? false);
    setTechnicalIssueDescription(session.technicalIssueDescription ?? '');
    setSessionComments(session.sessionComments ?? '');
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    const startMins = actualStartTime ? parseInt(actualStartTime.split(':')[0], 10) * 60 + parseInt(actualStartTime.split(':')[1] ?? '0', 10) : 0;
    const endMins = actualEndTime ? parseInt(actualEndTime.split(':')[0], 10) * 60 + parseInt(actualEndTime.split(':')[1] ?? '0', 10) : 0;
    if (endMins <= startMins) {
      showToast('Actual end time must be after start time', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const dto: SubmitSessionReportDto = {
        actualStartTime: toTimeSpan(actualStartTime),
        actualEndTime: toTimeSpan(actualEndTime),
        workCompletedPercentage: workCompletedPercentage,
        workDescription: workDescription.trim() || undefined,
        hadDelay,
        delayReason: hadDelay ? delayReason.trim() || undefined : undefined,
        hadTechnicalIssues,
        technicalIssueDescription: hadTechnicalIssues ? technicalIssueDescription.trim() || undefined : undefined,
        sessionComments: sessionComments.trim() || undefined,
      };
      await editingApi.submitSessionReport(request.id, session.sessionNumber, dto);
      showToast('Session report submitted successfully', 'success');
      onSuccess();
      handleOpenChange(false);
    } catch (error: unknown) {
      console.error('Failed to submit session report:', error);
      const err = error as { response?: { data?: { error?: string } } };
      showToast(err.response?.data?.error || 'Failed to submit report', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isViewMode = mode === 'view' || !!session.reportSubmittedAt;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isViewMode ? `Session ${session.sessionNumber} Report` : `Submit Report - Session ${session.sessionNumber}`}
          </DialogTitle>
        </DialogHeader>

        {isViewMode ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Scheduled Start</div>
                <div className="font-medium">
                  {session.availableDatetime
                    ? formatTimeSpan(`${parseTime(session.availableDatetime)}:00`)
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Scheduled End</div>
                <div className="font-medium">
                  {session.availableDatetime && session.sessionDurationMinutes
                    ? formatTimeSpan(`${calculateEndTime(session.availableDatetime, session.sessionDurationMinutes)}:00`)
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Actual Start</div>
                <div className="font-medium">{formatTimeSpan(session.actualStartTime)}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Actual End</div>
                <div className="font-medium">{formatTimeSpan(session.actualEndTime)}</div>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">Work Completed</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${session.workCompletedPercentage ?? 0}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{session.workCompletedPercentage ?? 0}%</span>
              </div>
            </div>

            {session.workDescription && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Work Description</div>
                <div className="p-3 border border-border rounded-lg text-sm">{session.workDescription}</div>
              </div>
            )}

            {session.hadDelay && session.delayReason && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Delay</div>
                <div className="p-3 border border-amber-200 dark:border-amber-800 rounded-lg text-sm bg-amber-50/50 dark:bg-amber-950/20">
                  {session.delayReason}
                </div>
              </div>
            )}

            {session.hadTechnicalIssues && session.technicalIssueDescription && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Technical Issues</div>
                <div className="p-3 border border-red-200 dark:border-red-800 rounded-lg text-sm bg-red-50/50 dark:bg-red-950/20">
                  {session.technicalIssueDescription}
                </div>
              </div>
            )}

            {session.sessionComments && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Comments</div>
                <div className="p-3 border border-border rounded-lg text-sm">{session.sessionComments}</div>
              </div>
            )}

            {session.reportSubmittedAt && (
              <div className="text-sm text-muted-foreground pt-2 border-t">
                Reported by <span className="font-medium">{session.reportSubmitterName || 'Unknown'}</span> on {formatDateTime(session.reportSubmittedAt)}
              </div>
            )}
            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Actual Start Time</Label>
                <Input
                  type="time"
                  value={actualStartTime}
                  onChange={(e) => setActualStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Actual End Time</Label>
                <Input
                  type="time"
                  value={actualEndTime}
                  onChange={(e) => setActualEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Work Completed: {workCompletedPercentage}%</Label>
              <Slider
                min={0}
                max={100}
                step={5}
                value={[workCompletedPercentage]}
                onValueChange={([v]) => setWorkCompletedPercentage(v ?? 0)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>What was done</Label>
              <Textarea
                placeholder="Brief description of work completed"
                maxLength={200}
                value={workDescription}
                onChange={(e) => setWorkDescription(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">{workDescription.length}/200</p>
            </div>

            <div className="space-y-2">
              <Label>Any Delay?</Label>
              <RadioGroup value={hadDelay ? 'yes' : 'no'} onValueChange={(v) => setHadDelay(v === 'yes')}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="yes" id="delay-yes" />
                  <Label htmlFor="delay-yes" className="font-normal cursor-pointer">Yes</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="no" id="delay-no" />
                  <Label htmlFor="delay-no" className="font-normal cursor-pointer">No</Label>
                </div>
              </RadioGroup>
              {hadDelay && (
                <Textarea
                  placeholder="Describe the delay"
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  rows={2}
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Technical Issues?</Label>
              <RadioGroup value={hadTechnicalIssues ? 'yes' : 'no'} onValueChange={(v) => setHadTechnicalIssues(v === 'yes')}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="yes" id="tech-yes" />
                  <Label htmlFor="tech-yes" className="font-normal cursor-pointer">Yes</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="no" id="tech-no" />
                  <Label htmlFor="tech-no" className="font-normal cursor-pointer">No</Label>
                </div>
              </RadioGroup>
              {hadTechnicalIssues && (
                <Textarea
                  placeholder="Describe the technical issues"
                  value={technicalIssueDescription}
                  onChange={(e) => setTechnicalIssueDescription(e.target.value)}
                  rows={2}
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Additional Comments (optional)</Label>
              <Textarea
                placeholder="Any other comments"
                maxLength={500}
                value={sessionComments}
                onChange={(e) => setSessionComments(e.target.value)}
                rows={2}
              />
              <p className="text-xs text-muted-foreground">{sessionComments.length}/500</p>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
