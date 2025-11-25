import React, { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WorkflowRequest } from '../types/workflow';

interface IngestActionsProps {
  request: WorkflowRequest;
  onAction: (action: string, data: any) => void;
}

export const IngestActions: React.FC<IngestActionsProps> = ({ request, onAction }) => {
  const [ingestData, setIngestData] = useState({
    ingestStatus: '',
    notDoneReason: '',
    folderPath: ''
  });

  const handleStatusChange = () => {
    if (ingestData.ingestStatus === 'Completed') {
      if (!ingestData.folderPath.trim()) {
        alert('Please provide the folder path where content is stored');
        return;
      }

      onAction('mark_completed', {
        ingestStatus: 'Completed',
        ingestFolderPath: ingestData.folderPath,
        ingestNotes: '',
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
      <CardHeader>
        <CardTitle>Ingest Actions</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="ingestStatus">Ingest Status</Label>
            <Select
              value={ingestData.ingestStatus}
              onValueChange={(value) => setIngestData({ ...ingestData, ingestStatus: value })}
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
              />
            </div>
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
            />
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-4 border-t">
          {ingestData.ingestStatus === 'Completed' && (
            <Button
              onClick={handleStatusChange}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark as Completed
            </Button>
          )}
          {ingestData.ingestStatus === 'Not Done' && (
            <Button
              onClick={handleStatusChange}
              className="bg-red-600 text-white hover:bg-red-700"
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
