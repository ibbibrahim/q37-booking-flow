import React, { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
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
        newStatus: 'Completed',
        folderPath: ingestData.folderPath
      });
    } else if (ingestData.ingestStatus === 'Not Done') {
      if (!ingestData.notDoneReason.trim()) {
        alert('Please provide a reason for marking as Not Done');
        return;
      }
      onAction('mark_not_done', {
        newStatus: 'Not Done',
        reason: ingestData.notDoneReason
      });
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-xl font-bold text-card-foreground mb-6">Ingest Actions</h3>

      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Ingest Status
            </label>
            <select
              value={ingestData.ingestStatus}
              onChange={(e) => setIngestData({ ...ingestData, ingestStatus: e.target.value })}
              className="w-full px-4 py-2.5 bg-muted border border-border text-card-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              <option value="">—</option>
              <option value="Completed">Completed</option>
              <option value="Not Done">Not Done</option>
            </select>
          </div>

          {ingestData.ingestStatus === 'Completed' && (
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Folder Path <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={ingestData.folderPath}
                onChange={(e) => setIngestData({ ...ingestData, folderPath: e.target.value })}
                placeholder="e.g., /storage/ingest/2025-10-28/content-001"
                className="w-full px-4 py-2.5 bg-muted border border-border text-card-foreground placeholder-muted-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
          )}
        </div>

        {ingestData.ingestStatus === 'Not Done' && (
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              If Not Done, Reason <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={ingestData.notDoneReason}
              onChange={(e) => setIngestData({ ...ingestData, notDoneReason: e.target.value })}
              placeholder="e.g., Source failure, file missing, guest no-show"
              className="w-full px-4 py-2.5 bg-muted border border-border text-card-foreground placeholder-muted-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-border">
        {ingestData.ingestStatus === 'Completed' && (
          <button
            onClick={handleStatusChange}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
          >
            <CheckCircle2 size={18} />
            Mark as Completed
          </button>
        )}
        {ingestData.ingestStatus === 'Not Done' && (
          <button
            onClick={handleStatusChange}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
          >
            <XCircle size={18} />
            Mark as Not Done
          </button>
        )}
      </div>
    </div>
  );
};
