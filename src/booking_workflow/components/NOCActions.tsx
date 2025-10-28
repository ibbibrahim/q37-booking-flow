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
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-xl font-bold text-card-foreground mb-6">NOC Actions</h3>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-card-foreground mb-2">
            Acknowledge
          </label>
          <select
            value={nocData.action}
            onChange={(e) => setNocData({ ...nocData, action: e.target.value })}
            className="w-full px-4 py-2.5 bg-muted border border-border text-card-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          >
            <option value="">—</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="in_progress">In Progress</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-card-foreground mb-2">
            Assigned Resources (NOC)
          </label>
          <input
            type="text"
            value={nocData.assignedResources}
            onChange={(e) => setNocData({ ...nocData, assignedResources: e.target.value })}
            placeholder="e.g., Encoder-01, SRT-TX-A, SDI Patch 3"
            className="w-full px-4 py-2.5 bg-muted border border-border text-card-foreground placeholder-muted-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-card-foreground mb-2">
            Clarification for Booking (if needed)
          </label>
          <textarea
            value={nocData.clarificationMessage}
            onChange={(e) => setNocData({ ...nocData, clarificationMessage: e.target.value })}
            placeholder="e.g., Need guest confirmed number and SRT pub key"
            rows={3}
            className="w-full px-4 py-2.5 bg-muted border border-border text-card-foreground placeholder-muted-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-card-foreground mb-2">
            Forward to Ingest?
          </label>
          <select
            value={nocData.forwardToIngest}
            onChange={(e) => setNocData({ ...nocData, forwardToIngest: e.target.value })}
            className="w-full px-4 py-2.5 bg-muted border border-border text-card-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          >
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-border">
        <button
          onClick={handleSaveUpdates}
          className="flex items-center gap-2 px-5 py-2.5 bg-muted hover:bg-muted/80 text-card-foreground rounded-lg transition-colors font-medium border border-border"
        >
          <CheckCircle2 size={18} />
          Save NOC Updates
        </button>
        <button
          onClick={handleRequestClarification}
          className="flex items-center gap-2 px-5 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium"
        >
          <AlertCircle size={18} />
          Request Clarification
        </button>
        <button
          onClick={handleSendToIngest}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
        >
          <Send size={18} />
          Send to Ingest
        </button>
      </div>
    </div>
  );
};
