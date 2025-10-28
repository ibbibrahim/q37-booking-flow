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
    returnPath: '',
    keyFill: '',
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

        {isIncomingFeed && (
          <>
            <div className="pt-4 border-t border-border">
              <h4 className="text-base font-semibold text-card-foreground mb-4">Feed Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Source Type <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={nocData.sourceType}
                    onChange={(e) => setNocData({ ...nocData, sourceType: e.target.value, qmcSource: '' })}
                    className="w-full px-4 py-2.5 bg-muted border border-border text-card-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    <option value="">Select Source Type</option>
                    <option value="QMC Earth Station">QMC Earth Station</option>
                    <option value="vMix">vMix</option>
                    <option value="SRT">SRT</option>
                  </select>
                </div>

                {nocData.sourceType === 'QMC Earth Station' && (
                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-2">
                      Source <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={nocData.qmcSource}
                      onChange={(e) => setNocData({ ...nocData, qmcSource: e.target.value })}
                      className="w-full px-4 py-2.5 bg-muted border border-border text-card-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
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

                {nocData.sourceType === 'vMix' && (
                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-2">
                      vMix Input Number
                    </label>
                    <input
                      type="text"
                      value={nocData.vmixInputNumber}
                      onChange={(e) => setNocData({ ...nocData, vmixInputNumber: e.target.value })}
                      placeholder="Enter vMix input number"
                      className="w-full px-4 py-2.5 bg-muted border border-border text-card-foreground placeholder-muted-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Assigned Resources
                  </label>
                  <select
                    value={nocData.resourceAssignmentType}
                    onChange={(e) => setNocData({ ...nocData, resourceAssignmentType: e.target.value })}
                    className="w-full px-4 py-2.5 bg-muted border border-border text-card-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    <option value="">Select Assignment Type</option>
                    <option value="Main">Main</option>
                    <option value="Backup">Backup</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Resolution
                  </label>
                  <select
                    value={nocData.resolution}
                    onChange={(e) => setNocData({ ...nocData, resolution: e.target.value })}
                    className="w-full px-4 py-2.5 bg-muted border border-border text-card-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    <option value="">Select Resolution</option>
                    <option value="HD">HD</option>
                    <option value="UHD">UHD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Return Path
                  </label>
                  <select
                    value={nocData.returnPath}
                    onChange={(e) => setNocData({ ...nocData, returnPath: e.target.value })}
                    className="w-full px-4 py-2.5 bg-muted border border-border text-card-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    <option value="">Select Return Path</option>
                    <option value="Enabled">Enabled</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Key/Fill
                  </label>
                  <select
                    value={nocData.keyFill}
                    onChange={(e) => setNocData({ ...nocData, keyFill: e.target.value })}
                    className="w-full px-4 py-2.5 bg-muted border border-border text-card-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    <option value="">Select Key/Fill</option>
                    <option value="None">None</option>
                    <option value="Key">Key</option>
                    <option value="Fill">Fill</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}

        <div className={isIncomingFeed ? 'pt-4 border-t border-border' : ''}>
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
