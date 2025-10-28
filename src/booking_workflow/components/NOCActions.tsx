import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Send, Plus, Trash2 } from 'lucide-react';
import type { WorkflowRequest } from '../types/workflow';

interface NOCActionsProps {
  request: WorkflowRequest;
  onAction: (action: string, data: any) => void;
}

interface AssignedResource {
  id: string;
  resourceName: string;
  type: 'Main' | 'Backup';
}

export const NOCActions: React.FC<NOCActionsProps> = ({ request, onAction }) => {
  const [nocData, setNocData] = useState({
    action: '',
    sourceType: '',
    qmcSource: '',
    resolution: '',
    clarificationMessage: '',
    forwardToIngest: 'Yes'
  });

  const [assignedResources, setAssignedResources] = useState<AssignedResource[]>([]);
  const [newResourceName, setNewResourceName] = useState('');
  const [newResourceType, setNewResourceType] = useState<'Main' | 'Backup'>('Main');

  useEffect(() => {
    if (nocData.sourceType && nocData.qmcSource) {
      const feedResourceName = `${nocData.sourceType} - ${nocData.qmcSource}${nocData.resolution ? ` (${nocData.resolution})` : ''}`;
      const existingIndex = assignedResources.findIndex(r =>
        r.resourceName.startsWith(`${nocData.sourceType} - ${nocData.qmcSource}`)
      );

      if (existingIndex >= 0) {
        const updated = [...assignedResources];
        updated[existingIndex] = {
          ...updated[existingIndex],
          resourceName: feedResourceName
        };
        setAssignedResources(updated);
      }
    }
  }, [nocData.sourceType, nocData.qmcSource, nocData.resolution]);

  const handleAddFeedResource = () => {
    if (!nocData.sourceType || !nocData.qmcSource) {
      alert('Please select both Source Type and Source');
      return;
    }

    const feedResourceName = `${nocData.sourceType} - ${nocData.qmcSource}${nocData.resolution ? ` (${nocData.resolution})` : ''}`;

    const existingIndex = assignedResources.findIndex(r =>
      r.resourceName.startsWith(`${nocData.sourceType} - ${nocData.qmcSource}`)
    );

    if (existingIndex >= 0) {
      const updated = [...assignedResources];
      updated[existingIndex] = {
        ...updated[existingIndex],
        resourceName: feedResourceName,
        type: 'Main'
      };
      setAssignedResources(updated);
    } else {
      const newResource: AssignedResource = {
        id: Date.now().toString(),
        resourceName: feedResourceName,
        type: 'Main'
      };
      setAssignedResources([...assignedResources, newResource]);
    }
  };

  const handleAddResource = () => {
    if (!newResourceName.trim()) {
      alert('Please enter a resource name');
      return;
    }

    const newResource: AssignedResource = {
      id: Date.now().toString(),
      resourceName: newResourceName.trim(),
      type: newResourceType
    };

    setAssignedResources([...assignedResources, newResource]);
    setNewResourceName('');
    setNewResourceType('Main');
  };

  const handleRemoveResource = (id: string) => {
    setAssignedResources(assignedResources.filter(r => r.id !== id));
  };

  const handleSaveUpdates = () => {
    onAction('save_noc_updates', {
      ...nocData,
      assignedResources,
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
    if (assignedResources.length === 0) {
      alert('Please assign at least one resource before sending to Ingest');
      return;
    }
    onAction('send_to_ingest', {
      assignedResources,
      newStatus: 'With Ingest'
    });
  };

  const isIncomingFeed = request.bookingType === 'Incoming Feed';

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
      <div className="p-8 border-b border-slate-200">
        <h3 className="text-xl font-bold text-slate-900">NOC Actions</h3>
      </div>

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Acknowledge
            </label>
            <select
              value={nocData.action}
              onChange={(e) => setNocData({ ...nocData, action: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            >
              <option value="">—</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="in_progress">In Progress</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Forward to Ingest?
            </label>
            <select
              value={nocData.forwardToIngest}
              onChange={(e) => setNocData({ ...nocData, forwardToIngest: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
        </div>

        {isIncomingFeed && (
          <div className="pt-6 border-t border-slate-200">
            <h4 className="text-base font-semibold text-slate-900 mb-6">Feed Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Source Type <span className="text-red-600">*</span>
                </label>
                <select
                  value={nocData.sourceType}
                  onChange={(e) => setNocData({ ...nocData, sourceType: e.target.value, qmcSource: '' })}
                  className="w-full px-4 py-3 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="">Select Source Type</option>
                  <option value="QMC Earth Station">QMC Earth Station</option>
                  <option value="Streaming">Streaming</option>
                </select>
              </div>

              {nocData.sourceType === 'QMC Earth Station' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Source <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={nocData.qmcSource}
                    onChange={(e) => setNocData({ ...nocData, qmcSource: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
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
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Resolution
                </label>
                <select
                  value={nocData.resolution}
                  onChange={(e) => setNocData({ ...nocData, resolution: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="">Select Resolution</option>
                  <option value="HD">HD</option>
                  <option value="UHD">UHD</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleAddFeedResource}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-sm flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Add to Resources
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={isIncomingFeed ? 'pt-6 border-t border-slate-200' : ''}>
          <h4 className="text-base font-semibold text-slate-900 mb-6">Assigned Resources (NOC)</h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Resource Name
              </label>
              <input
                type="text"
                value={newResourceName}
                onChange={(e) => setNewResourceName(e.target.value)}
                placeholder="e.g., Encoder-01, SRT-TX-A, SDI Patch 3"
                className="w-full px-4 py-3 bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddResource();
                  }
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Type
              </label>
              <div className="flex gap-2">
                <select
                  value={newResourceType}
                  onChange={(e) => setNewResourceType(e.target.value as 'Main' | 'Backup')}
                  className="flex-1 px-4 py-3 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="Main">Main</option>
                  <option value="Backup">Backup</option>
                </select>
                <button
                  onClick={handleAddResource}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-sm flex items-center gap-2"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>

          {assignedResources.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Resource Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {assignedResources.map((resource) => (
                    <tr key={resource.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {resource.resourceName}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          resource.type === 'Main'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {resource.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <button
                          onClick={() => handleRemoveResource(resource.id)}
                          className="text-red-600 hover:text-red-800 transition-colors p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Clarification for Booking (if needed)
            </label>
            <textarea
              value={nocData.clarificationMessage}
              onChange={(e) => setNocData({ ...nocData, clarificationMessage: e.target.value })}
              placeholder="e.g., Need guest confirmed number and SRT pub key"
              rows={4}
              className="w-full px-4 py-3 bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 p-8 pt-6 border-t border-slate-200 bg-slate-50">
        <button
          onClick={handleSaveUpdates}
          className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-900 rounded-lg transition-colors font-medium border border-slate-300 shadow-sm"
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
