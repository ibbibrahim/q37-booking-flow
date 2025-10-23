import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Send } from 'lucide-react';
import type { WorkflowRequest } from '../types/workflow';

interface NOCActionsProps {
  request: WorkflowRequest;
  onAction: (action: string, data: any) => void;
}

export const NOCActions: React.FC<NOCActionsProps> = ({ request, onAction }) => {
  const [nocData, setNocData] = useState({
    action: '',
    assignedResources: '',
    clarificationMessage: '',
    forwardToIngest: 'Yes'
  });

  const handleSaveUpdates = () => {
    onAction('save_noc_updates', {
      ...nocData,
      newStatus: 'Resources Added'
    });
  };

  const handleRequestClarification = () => {
    if (!nocData.clarificationMessage.trim()) {
      alert('Please provide a clarification message');
      return;
    }
    onAction('request_clarification', {
      clarificationMessage: nocData.clarificationMessage,
      newStatus: 'Clarification Requested'
    });
  };

  const handleSendToIngest = () => {
    if (!nocData.assignedResources.trim()) {
      alert('Please assign resources before sending to Ingest');
      return;
    }
    onAction('send_to_ingest', {
      assignedResources: nocData.assignedResources,
      newStatus: 'With Ingest'
    });
  };

  return (
    <div className="space-y-6 bg-slate-800 p-6 rounded-lg">
      <h3 className="text-xl font-bold text-white mb-4">NOC Actions</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Acknowledge
          </label>
          <select
            value={nocData.action}
            onChange={(e) => setNocData({ ...nocData, action: e.target.value })}
            className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="">—</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="in_progress">In Progress</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Assigned Resources (NOC)
          </label>
          <input
            type="text"
            value={nocData.assignedResources}
            onChange={(e) => setNocData({ ...nocData, assignedResources: e.target.value })}
            placeholder="e.g., Encoder-01, SRT-TX-A, SDI Patchbay 3"
            className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Clarification for Booking (if needed)
          </label>
          <textarea
            value={nocData.clarificationMessage}
            onChange={(e) => setNocData({ ...nocData, clarificationMessage: e.target.value })}
            placeholder="e.g., Need guest confirmed number and SRT pub key"
            rows={3}
            className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Forward to Ingest?
          </label>
          <select
            value={nocData.forwardToIngest}
            onChange={(e) => setNocData({ ...nocData, forwardToIngest: e.target.value })}
            className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={handleSaveUpdates}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
        >
          Save NOC Updates
        </button>
        <button
          onClick={handleRequestClarification}
          className="flex items-center gap-2 px-5 py-2.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
        >
          <AlertCircle size={18} />
          Request Clarification
        </button>
        <button
          onClick={handleSendToIngest}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          <Send size={18} />
          Send to Ingest
        </button>
      </div>
    </div>
  );
};
