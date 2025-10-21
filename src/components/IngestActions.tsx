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
    notDoneReason: ''
  });

  const handleStatusChange = () => {
    if (ingestData.ingestStatus === 'Completed') {
      onAction('mark_completed', {
        newStatus: 'Completed'
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
    <div className="space-y-6 bg-slate-800 p-6 rounded-lg">
      <h3 className="text-xl font-bold text-white mb-4">Ingest Actions</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Ingest Status
          </label>
          <select
            value={ingestData.ingestStatus}
            onChange={(e) => setIngestData({ ...ingestData, ingestStatus: e.target.value })}
            className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="">—</option>
            <option value="Completed">Completed</option>
            <option value="Not Done">Not Done</option>
          </select>
        </div>

        {ingestData.ingestStatus === 'Not Done' && (
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              If Not Done, Reason
            </label>
            <input
              type="text"
              value={ingestData.notDoneReason}
              onChange={(e) => setIngestData({ ...ingestData, notDoneReason: e.target.value })}
              placeholder="e.g., Source failure, file missing, guest no-show"
              className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        {ingestData.ingestStatus === 'Completed' && (
          <button
            onClick={handleStatusChange}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <CheckCircle2 size={18} />
            Mark as Completed
          </button>
        )}
        {ingestData.ingestStatus === 'Not Done' && (
          <button
            onClick={handleStatusChange}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            <XCircle size={18} />
            Mark as Not Done
          </button>
        )}
      </div>
    </div>
  );
};
