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
    sourceType: '',
    qmcSource: '',
    vmixInputNumber: '',
    resourceAssignmentType: '',
    resolution: '',
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

  const isIncomingFeed = request.bookingType === 'Incoming Feed';

  return (
    <div className="bg-card border border-border rounded-lg p-8 shadow-sm">
      <h3 className="text-xl font-bold text-card-foreground mb-8">NOC Actions</h3>

      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-3">
              Acknowledge
            </label>
            <select
              value={nocData.action}
              onChange={(e) => setNocData({ ...nocData, action: e.target.value })}
              className="w-full px-4 py-3 bg-muted border border-border text-card-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            >
              <option value="">—</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="in_progress">In Progress</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-3">
              Forward to Ingest?
            </label>
            <select
              value={nocData.forwardToIngest}
              onChange={(e) => setNocData({ ...nocData, forwardToIngest: e.target.value })}
              className="w-full px-4 py-3 bg-muted border border-border text-card-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
        </div>

        {isIncomingFeed && (
          <div className="pt-6 border-t border-border">
            <h4 className="text-base font-semibold text-card-foreground mb-6">Feed Configuration</h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-3">
                  Source Type <span className="text-destructive">*</span>
                </label>
                <select
                  value={nocData.sourceType}
                  onChange={(e) => setNocData({ ...nocData, sourceType: e.target.value, qmcSource: '', vmixInputNumber: '' })}
                  className="w-full px-4 py-3 bg-muted border border-border text-card-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                >
                  <option value="">Select Source Type</option>
                  <option value="QMC Earth Station">QMC Earth Station</option>
                  <option value="Streaming">Streaming</option>
                </select>
              </div>

              {nocData.sourceType === 'QMC Earth Station' && (
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-3">
                    Source <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={nocData.qmcSource}
                    onChange={(e) => setNocData({ ...nocData, qmcSource: e.target.value })}
                    className="w-full px-4 py-3 bg-muted border border-border text-card-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  >
                    <option value="">Select Source</option>
                    {Array.from({ length: 10 }, (_, i) => (
                      <option key={i + 1} value={`Ext-${i + 1}`}>
                        Ext-{i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-card-foreground mb-3">
                  Assigned Resources
                </label>
                <select
                  value={nocData.resourceAssignmentType}
                  onChange={(e) => setNocData({ ...nocData, resourceAssignmentType: e.target.value })}
                  className="w-full px-4 py-3 bg-muted border border-border text-card-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                >
                  <option value="">Select Assignment Type</option>
                  <option value="Main">Main</option>
                  <option value="Backup">Backup</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-card-foreground mb-3">
                  Resolution
                </label>
                <select
                  value={nocData.resolution}
                  onChange={(e) => setNocData({ ...nocData, resolution: e.target.value })}
                  className="w-full px-4 py-3 bg-muted border border-border text-card-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                >
                  <option value="">Select Resolution</option>
                  <option value="HD">HD</option>
                  <option value="UHD">UHD</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className={isIncomingFeed ? 'pt-6 border-t border-border' : ''}>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-3">
                Assigned Resources (NOC)
              </label>
              <input
                type="text"
                value={nocData.assignedResources}
                onChange={(e) => setNocData({ ...nocData, assignedResources: e.target.value })}
                placeholder="e.g., Encoder-01, SRT-TX-A, SDI Patch 3"
                className="w-full px-4 py-3 bg-muted border border-border text-card-foreground placeholder-muted-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-3">
                Clarification for Booking (if needed)
              </label>
              <textarea
                value={nocData.clarificationMessage}
                onChange={(e) => setNocData({ ...nocData, clarificationMessage: e.target.value })}
                placeholder="e.g., Need guest confirmed number and SRT pub key"
                rows={4}
                className="w-full px-4 py-3 bg-muted border border-border text-card-foreground placeholder-muted-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t border-border">
        <button
          onClick={handleSaveUpdates}
          className="flex items-center gap-2 px-6 py-3 bg-muted hover:bg-muted/80 text-card-foreground rounded-lg transition-colors font-medium border border-border shadow-sm"
        >
          <CheckCircle2 size={18} />
          Save NOC Updates
        </button>
        <button
          onClick={handleRequestClarification}
          className="flex items-center gap-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium shadow-sm"
        >
          <AlertCircle size={18} />
          Request Clarification
        </button>
        <button
          onClick={handleSendToIngest}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium shadow-sm"
        >
          <Send size={18} />
          Send to Ingest
        </button>
      </div>
    </div>
  );
};
