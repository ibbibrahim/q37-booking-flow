import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Lock, AlertTriangle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { WorkflowRequest } from '../types/workflow';

interface IngestActionsProps {
  request: WorkflowRequest;
  onAction: (action: string, data: any) => void;
}

function deriveIngestSelectValue(req: WorkflowRequest): string {
  if (req.ingestStatus && ['Completed', 'Partially Completed', 'Not Done'].includes(req.ingestStatus)) {
    return req.ingestStatus;
  }
  if (req.status === 'Completed') return 'Completed';
  if (req.status === 'Partially Completed') return 'Partially Completed';
  if (req.status === 'Not Done') return 'Not Done';
  return '';
}

export const IngestActions: React.FC<IngestActionsProps> = ({ request, onAction }) => {
  const [ingestData, setIngestData] = useState({
    ingestStatus: '',
    notDoneReason: '',
    folderPath: '',
    mediaId: '',
    notes: '',
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>('');
  const [isEditingSavedIngest, setIsEditingSavedIngest] = useState(false);

  const isActiveIngest = request.status === 'With Ingest';
  const isPostCompleteEdit = ['Completed', 'Partially Completed', 'Not Done'].includes(request.status);
  const showPostCompleteSummary = isPostCompleteEdit && !isEditingSavedIngest;
  const isAcknowledged = request.ingestAcknowledged === true;
  const formLocked = isActiveIngest && !isAcknowledged;

  const syncIngestFormFromRequest = () => {
    setIngestData({
      ingestStatus: deriveIngestSelectValue(request),
      notDoneReason: request.ingestNotDoneReason || '',
      folderPath: request.ingestFolderPath || '',
      mediaId: '',
      notes: request.ingestNotes || '',
    });
  };

  useEffect(() => {
    if (isActiveIngest) {
      setIsEditingSavedIngest(false);
    }
  }, [isActiveIngest, request.id]);

  useEffect(() => {
    if (!isPostCompleteEdit || isEditingSavedIngest) return;
    syncIngestFormFromRequest();
  }, [
    isPostCompleteEdit,
    isEditingSavedIngest,
    request.id,
    request.updatedAt,
    request.status,
    request.ingestStatus,
    request.ingestFolderPath,
    request.ingestNotes,
    request.ingestNotDoneReason,
  ]);

  const handleBackToSummary = () => {
    setIsEditingSavedIngest(false);
    if (isPostCompleteEdit) {
      syncIngestFormFromRequest();
    }
  };

  const handleAcknowledge = () => {
    onAction('acknowledge', { changedBy: 10017 });
  };

  const handleStatusChangeRequest = () => {
    if (ingestData.ingestStatus === 'Completed' || ingestData.ingestStatus === 'Partially Completed') {
      if (!ingestData.folderPath.trim()) {
        alert('Please provide the folder path where content is stored');
        return;
      }
    } else if (ingestData.ingestStatus === 'Not Done') {
      if (!ingestData.notDoneReason.trim()) {
        alert('Please provide a reason for marking as Not Done');
        return;
      }
    }

    setPendingStatus(ingestData.ingestStatus);
    setShowConfirmModal(true);
  };

  const handleConfirmStatusChange = () => {
    if (pendingStatus === 'Completed' || pendingStatus === 'Partially Completed') {
      onAction('mark_completed', {
        ingestStatus: pendingStatus,
        ingestFolderPath: ingestData.folderPath,
        mediaId: ingestData.mediaId || null,
        ingestNotes: ingestData.notes,
        changedBy: 10017,
      });
    } else if (pendingStatus === 'Not Done') {
      onAction('mark_not_done', {
        ingestStatus: 'Not Done',
        ingestNotDoneReason: ingestData.notDoneReason,
        changedBy: 10017,
      });
    }

    setShowConfirmModal(false);
    setPendingStatus('');
    if (!isActiveIngest) {
      setIsEditingSavedIngest(false);
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmModal(false);
    setPendingStatus('');
  };

  const actionLabel = (completedLabel: string) => (isActiveIngest ? completedLabel : 'Save ingest details');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Ingest Actions</CardTitle>
        {isActiveIngest && !isAcknowledged && (
          <Button onClick={handleAcknowledge} className="bg-blue-600 hover:bg-blue-700">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Acknowledge
          </Button>
        )}
        {isActiveIngest && isAcknowledged && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Acknowledged
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {showPostCompleteSummary && (
          <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-medium text-foreground">Recorded ingest outcome</div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  syncIngestFormFromRequest();
                  setIsEditingSavedIngest(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit ingest details
              </Button>
            </div>
            <div className="grid gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Status: </span>
                <span className="font-medium">{deriveIngestSelectValue(request) || request.status}</span>
              </div>
              {request.ingestFolderPath ? (
                <div>
                  <span className="text-muted-foreground">Folder path: </span>
                  <span className="break-all font-mono text-xs">{request.ingestFolderPath}</span>
                </div>
              ) : null}
              {request.ingestNotes ? (
                <div>
                  <span className="text-muted-foreground">Notes: </span>
                  <span className="whitespace-pre-wrap">{request.ingestNotes}</span>
                </div>
              ) : null}
              {request.ingestNotDoneReason ? (
                <div>
                  <span className="text-muted-foreground">Not done reason: </span>
                  <span>{request.ingestNotDoneReason}</span>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {isPostCompleteEdit && isEditingSavedIngest && (
          <p className="text-sm text-muted-foreground">
            Update folder path, notes, or outcome, then save. Confirm to apply via the same ingest update API.
          </p>
        )}

        {isActiveIngest && !isAcknowledged && (
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
            <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-900 dark:text-blue-100">Acknowledgment Required</AlertTitle>
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              Please acknowledge this request before proceeding with ingest actions. Click the{' '}
              <strong>Acknowledge</strong> button above to continue.
            </AlertDescription>
          </Alert>
        )}

        {!showPostCompleteSummary && (
          <>
            {isPostCompleteEdit && isEditingSavedIngest && (
              <div className="flex justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={handleBackToSummary}>
                  Back to summary
                </Button>
              </div>
            )}

            <div className={`space-y-6 ${formLocked ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="ingestStatus">Ingest Status</Label>
                  <Select
                    value={ingestData.ingestStatus}
                    onValueChange={(value) => setIngestData({ ...ingestData, ingestStatus: value })}
                    disabled={formLocked}
                  >
                    <SelectTrigger id="ingestStatus">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Partially Completed">Partially Completed</SelectItem>
                      <SelectItem value="Not Done">Not Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(ingestData.ingestStatus === 'Completed' || ingestData.ingestStatus === 'Partially Completed') && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="folderPath">
                      Folder Path <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="folderPath"
                      type="text"
                      value={ingestData.folderPath}
                      onChange={(e) => setIngestData({ ...ingestData, folderPath: e.target.value })}
                      placeholder="e.g., /storage/ingest/2025-10-28/content-001"
                      disabled={formLocked}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mediaId">Media ID (Optional)</Label>
                    <Input
                      id="mediaId"
                      type="text"
                      value={ingestData.mediaId}
                      onChange={(e) => setIngestData({ ...ingestData, mediaId: e.target.value })}
                      placeholder="Enter media ID"
                      disabled={formLocked}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ingestNotes">Notes (Optional)</Label>
                    <Textarea
                      id="ingestNotes"
                      value={ingestData.notes}
                      onChange={(e) => setIngestData({ ...ingestData, notes: e.target.value })}
                      placeholder="Add optional notes..."
                      rows={3}
                      disabled={formLocked}
                    />
                  </div>
                </>
              )}

              {ingestData.ingestStatus === 'Not Done' && (
                <div className="space-y-2">
                  <Label htmlFor="notDoneReason">
                    If Not Done, Reason <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="notDoneReason"
                    type="text"
                    value={ingestData.notDoneReason}
                    onChange={(e) => setIngestData({ ...ingestData, notDoneReason: e.target.value })}
                    placeholder="e.g., Source failure, file missing, guest no-show"
                    disabled={formLocked}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 pt-4 border-t">
              {ingestData.ingestStatus === 'Completed' && (
                <Button
                  onClick={handleStatusChangeRequest}
                  className="bg-green-600 text-white hover:bg-green-700"
                  disabled={formLocked}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {actionLabel('Mark as Completed')}
                </Button>
              )}
              {ingestData.ingestStatus === 'Partially Completed' && (
                <Button
                  onClick={handleStatusChangeRequest}
                  className="bg-yellow-600 text-white hover:bg-yellow-700"
                  disabled={formLocked}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  {actionLabel('Mark as Partially Completed')}
                </Button>
              )}
              {ingestData.ingestStatus === 'Not Done' && (
                <Button
                  onClick={handleStatusChangeRequest}
                  className="bg-red-600 text-white hover:bg-red-700"
                  disabled={formLocked}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  {actionLabel('Mark as Not Done')}
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isActiveIngest ? 'Confirm Status Change' : 'Confirm ingest update'}</DialogTitle>
            <DialogDescription>
              {isActiveIngest ? (
                <>
                  Are you sure you want to mark this request as <strong>{pendingStatus}</strong>?
                  {pendingStatus === 'Not Done' && ' This action will mark the ingest operation as unsuccessful.'}
                  {pendingStatus === 'Partially Completed' && ' This indicates the ingest was only partially successful.'}
                  {pendingStatus === 'Completed' && ' This will mark the ingest operation as successful.'}
                </>
              ) : (
                <>
                  Save ingest details as <strong>{pendingStatus}</strong>? This uses the same ingest update request as
                  when the booking was first completed.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelConfirmation}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmStatusChange}
              className={
                pendingStatus === 'Completed'
                  ? 'bg-green-600 hover:bg-green-700'
                  : pendingStatus === 'Partially Completed'
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-red-600 hover:bg-red-700'
              }
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
