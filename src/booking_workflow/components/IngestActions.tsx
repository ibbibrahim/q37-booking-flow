import React, { useState } from 'react';
import { CheckCircle2, XCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import type { WorkflowRequest } from '../types/workflow';

interface IngestActionsProps {
  request: WorkflowRequest;
  onAction: (action: string, data: any) => void;
}

export const IngestActions: React.FC<IngestActionsProps> = ({ request, onAction }) => {
  const [ingestData, setIngestData] = useState({
    ingestStatus: '',
    notDoneReason: '',
    folderPath: '',
    mediaId: '',
    notes: ''
  });

  const isAcknowledged = request.ingestAcknowledged === true;

  const handleAcknowledge = () => {
    onAction('acknowledge', { changedBy: 10017 });
  };

  const handleStatusChange = () => {
    if (ingestData.ingestStatus === 'Completed') {
      if (!ingestData.folderPath.trim()) {
        alert('Please provide the folder path where content is stored');
        return;
      }
      if (!ingestData.mediaId.trim()) {
        alert('Please provide the Media ID');
        return;
      }

      onAction('mark_completed', {
        ingestStatus: 'Completed',
        ingestFolderPath: ingestData.folderPath,
        mediaId: ingestData.mediaId,
        ingestNotes: ingestData.notes,
        changedBy: 10017
      });
    } else if (ingestData.ingestStatus === 'Not Done') {
      if (!ingestData.notDoneReason.trim()) {
        alert('Please provide a reason for marking as Not Done');
        return;
      }

      onAction('mark_not_done', {
        ingestStatus: 'Not Done',
        ingestNotDoneReason: ingestData.notDoneReason,
        changedBy: 10017
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Ingest Actions</CardTitle>
        {!isAcknowledged && (
          <Button
            onClick={handleAcknowledge}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Acknowledge
          </Button>
        )}
        {isAcknowledged && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Acknowledged
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Acknowledgment Required Alert */}
        {!isAcknowledged && (
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
            <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-900 dark:text-blue-100">
              Acknowledgment Required
            </AlertTitle>
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              Please acknowledge this request before proceeding with ingest actions.
              Click the <strong>Acknowledge</strong> button above to continue.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Form - Disabled until acknowledged */}
        <div className={`space-y-6 ${!isAcknowledged ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="ingestStatus">Ingest Status</Label>
              <Select
                value={ingestData.ingestStatus}
                onValueChange={(value) => setIngestData({ ...ingestData, ingestStatus: value })}
                disabled={!isAcknowledged}
              >
                <SelectTrigger id="ingestStatus">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Not Done">Not Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {ingestData.ingestStatus === 'Completed' && (
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
                  disabled={!isAcknowledged}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mediaId">
                  Media ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="mediaId"
                  type="text"
                  value={ingestData.mediaId}
                  onChange={(e) => setIngestData({ ...ingestData, mediaId: e.target.value })}
                  placeholder="Enter media ID"
                  disabled={!isAcknowledged}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ingestNotes">
                  Notes (Optional)
                </Label>
                <Textarea
                  id="ingestNotes"
                  value={ingestData.notes}
                  onChange={(e) => setIngestData({ ...ingestData, notes: e.target.value })}
                  placeholder="Add optional notes..."
                  rows={3}
                  disabled={!isAcknowledged}
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
                disabled={!isAcknowledged}
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 pt-4 border-t">
          {ingestData.ingestStatus === 'Completed' && (
            <Button
              onClick={handleStatusChange}
              className="bg-green-600 text-white hover:bg-green-700"
              disabled={!isAcknowledged}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark as Completed
            </Button>
          )}
          {ingestData.ingestStatus === 'Not Done' && (
            <Button
              onClick={handleStatusChange}
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={!isAcknowledged}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Mark as Not Done
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
