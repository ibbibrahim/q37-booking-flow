import React, { useState, useEffect } from 'react';
import { X, Clock, User, Calendar, Tag, FileText, Package, History } from 'lucide-react';
import type { WorkflowRequest, WorkflowTransition, ResourceAssignment, UserRole } from '../types/workflow';
import { mockApi } from '../services/mockApi';

import { NOCActions } from './NOCActions';
import { IngestActions } from './IngestActions';

interface RequestDetailProps {
  request: WorkflowRequest;
  onClose: () => void;
  userRole: UserRole;
  onUpdate: () => void;
}

export const RequestDetail: React.FC<RequestDetailProps> = ({ request, onClose, userRole, onUpdate }) => {
  const [transitions, setTransitions] = useState<WorkflowTransition[]>([]);
  const [resources, setResources] = useState<ResourceAssignment[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'resources' | 'actions'>('details');

  useEffect(() => {
    loadData();
  }, [request.id]);

  const loadData = () => {
    mockApi.getTransitions(request.id).then(setTransitions);
    mockApi.getResources(request.id).then(setResources);
  };

  const handleNOCAction = async (action: string, data: any) => {
    await mockApi.updateRequestStatus(request.id, data.newStatus, data, userRole);
    await loadData();
    onUpdate();
  };

  const handleIngestAction = async (action: string, data: any) => {
    await mockApi.updateRequestStatus(request.id, data.newStatus, data, userRole);
    await loadData();
    onUpdate();
  };

  const showActions =
    (userRole === 'NOC' && (request.status === 'Submitted' || request.status === 'With NOC' || request.status === 'Clarification Requested')) ||
    (userRole === 'Ingest' && request.status === 'With Ingest');

  const renderFieldValue = (label: string, value: string | undefined) => {
    if (!value) return null;
    return (
      <div className="flex flex-col">
        <span className="text-xs text-slate-500 mb-1">{label}</span>
        <span className="text-sm font-medium text-slate-800">{value}</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{request.title}</h2>
            <p className="text-slate-300 text-sm mt-1">{request.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="border-b border-slate-200">
          <div className="flex">
            {[
              { id: 'details', label: 'Details', icon: FileText },
              { id: 'history', label: 'History', icon: History },
              { id: 'resources', label: 'Resources', icon: Package },
              ...(showActions ? [{ id: 'actions', label: 'Actions', icon: Tag }] : [])
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 mb-1">Status</span>
                  <span className="text-sm font-semibold text-blue-600">{request.status}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 mb-1">Priority</span>
                  <span className="text-sm font-semibold text-orange-600">{request.priority}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 mb-1">Language</span>
                  <span className="text-sm font-medium text-slate-800">{request.language}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 mb-1">NOC Required</span>
                  <span className="text-sm font-medium text-slate-800">{request.nocRequired}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderFieldValue('Program / Segment', request.program)}
                {renderFieldValue('Air Date/Time', new Date(request.airDateTime).toLocaleString())}
                {renderFieldValue('Booking Type', request.bookingType)}
                {renderFieldValue('Newsroom Ticket', request.newsroomTicket)}
              </div>

              {request.bookingType === 'Incoming Feed' && 'sourceType' in request && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <Tag size={16} />
                    Incoming Feed Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {renderFieldValue('Source Type', request.sourceType)}
                    {renderFieldValue('vMix Input', request.vmixInputNumber)}
                    {renderFieldValue('Return Path', request.returnPath)}
                    {renderFieldValue('Key/Fill', request.keyFill)}
                  </div>
                </div>
              )}

              {request.bookingType === 'Guest for iNEWS Rundown' && 'guestName' in request && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <User size={16} />
                    Guest & Rundown Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {renderFieldValue('Guest Name', request.guestName)}
                    {renderFieldValue('Guest Contact', request.guestContact)}
                    {renderFieldValue('iNEWS Rundown ID', request.inewsRundownId)}
                    {renderFieldValue('Story Slug', request.storySlug)}
                    {renderFieldValue('Rundown Position', request.rundownPosition)}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {renderFieldValue('Resources Needed', request.resourcesNeeded)}
                {renderFieldValue('Compliance Tags', request.complianceTags)}
              </div>

              {request.notes && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">Notes</h3>
                  <p className="text-sm text-slate-700">{request.notes}</p>
                </div>
              )}

              <div className="flex items-center gap-6 text-xs text-slate-500 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <User size={14} />
                  <span>Created by: {request.createdBy}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} />
                  <span>{new Date(request.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Workflow History</h3>
              {transitions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No workflow transitions yet
                </div>
              ) : (
                <div className="space-y-3">
                  {transitions.map(trans => (
                    <div key={trans.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-medium text-slate-600">{trans.fromStatus}</span>
                        <span className="text-slate-400">→</span>
                        <span className="text-sm font-semibold text-blue-600">{trans.toStatus}</span>
                      </div>
                      <p className="text-sm text-slate-700 mb-2">{trans.comment}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>By: {trans.changedBy}</span>
                        <span>{new Date(trans.changedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Assigned Resources</h3>
              {resources.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No resources assigned yet
                </div>
              ) : (
                <div className="space-y-3">
                  {resources.map(res => (
                    <div key={res.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-slate-800">{res.resourceName}</span>
                        <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded">{res.resourceType}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Assigned by: {res.assignedBy}</span>
                        <span>{new Date(res.assignedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'actions' && (
            <div>
              {userRole === 'NOC' && (
                <NOCActions request={request} onAction={handleNOCAction} />
              )}
              {userRole === 'Ingest' && (
                <IngestActions request={request} onAction={handleIngestAction} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
