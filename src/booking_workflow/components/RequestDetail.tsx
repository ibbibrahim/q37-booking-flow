import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Clock, User, Radio } from 'lucide-react';
import type {
  WorkflowRequest,
  WorkflowTransition,
  ResourceAssignment,
  UserRole,
} from '../types/workflow';
import { mockApi } from '../services/mockApi';
import { NOCActions } from './NOCActions';
import { IngestActions } from './IngestActions';

export const RequestDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [request, setRequest] = useState<WorkflowRequest | null>(null);
  const [transitions, setTransitions] = useState<WorkflowTransition[]>([]);
  const [resources, setResources] = useState<ResourceAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Detect current user role from the URL path (/booking, /noc, /ingest, /admin)
  const path = location.pathname.split('/')[1];
  const userRole: UserRole =
    (path?.charAt(0).toUpperCase() + path?.slice(1)) as UserRole || 'Booking';

  // Fetch request details and related data
  useEffect(() => {
    const loadRequest = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await mockApi.getRequestById(id);
        if (data) {
          setRequest(data);
          const [trans, res] = await Promise.all([
            mockApi.getTransitions(data.id),
            mockApi.getResources(data.id),
          ]);
          setTransitions(trans);
          setResources(res);
        }
      } catch (error) {
        console.error('Failed to fetch request details', error);
      } finally {
        setLoading(false);
      }
    };
    loadRequest();
  }, [id]);

  const handleNOCAction = async (action: string, data: any) => {
    if (!request) return;
    await mockApi.updateRequestStatus(request.id, data.newStatus, data, userRole);
    const [trans, res] = await Promise.all([
      mockApi.getTransitions(request.id),
      mockApi.getResources(request.id),
    ]);
    setTransitions(trans);
    setResources(res);
  };

  const handleIngestAction = async (action: string, data: any) => {
    if (!request) return;
    await mockApi.updateRequestStatus(request.id, data.newStatus, data, userRole);
    const [trans, res] = await Promise.all([
      mockApi.getTransitions(request.id),
      mockApi.getResources(request.id),
    ]);
    setTransitions(trans);
    setResources(res);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Request not found</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-md"
        >
          Go Back
        </button>
      </div>
    );
  }

  const showActions =
    (userRole === 'NOC' &&
      (request.status === 'Submitted' ||
        request.status === 'With NOC' ||
        request.status === 'Clarification Requested')) ||
    (userRole === 'Ingest' && request.status === 'With Ingest');

  const renderField = (label: string, value: string | undefined) => {
    if (!value) return null;
    return (
      <div className="mb-4">
        <div className="text-xs text-slate-500 mb-1">{label}</div>
        <div className="text-sm text-slate-900">{value}</div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900">{request.title}</h1>
              <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                {request.status}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
              <span>{request.id}</span>
              <span>•</span>
              <span>{request.bookingType}</span>
              <span>•</span>
              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                {request.priority}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {showActions && userRole === 'NOC' && (
            <div className="lg:col-span-2">
              <NOCActions request={request} onAction={handleNOCAction} />
            </div>
          )}
          <div
            className={
              showActions && userRole === 'NOC'
                ? 'space-y-6'
                : 'lg:col-span-2 space-y-6'
            }
          >
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Request Details
              </h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {renderField('Program / Segment', request.program)}
                {renderField('Language', request.language)}
                {renderField(
                  'Air Date / Time',
                  new Date(request.airDateTime).toLocaleString()
                )}
                {renderField('NOC Required', request.nocRequired)}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">
                  Feed Configuration
                </h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {request.bookingType === 'Incoming Feed' &&
                    'sourceType' in request && (
                      <>
                        {renderField('Source Type', request.sourceType)}
                        {renderField('vMix Input', request.vmixInputNumber)}
                        {renderField('Return Path', request.returnPath)}
                        {renderField('Key/Fill', request.keyFill)}
                      </>
                    )}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">
                  Resources Needed
                </h3>
                <div className="text-sm text-slate-900">
                  {request.resourcesNeeded || 'None specified'}
                </div>
              </div>

              {request.complianceTags && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">
                    Compliance Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                      {request.complianceTags}
                    </span>
                  </div>
                </div>
              )}

              {request.notes && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">
                    Notes
                  </h3>
                  <div className="bg-slate-50 rounded p-3 text-sm text-slate-700">
                    {request.notes}
                  </div>
                </div>
              )}

              {request.newsroomTicket && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">
                    Newsroom Ticket
                  </h3>
                  <div className="text-sm text-slate-900">
                    {request.newsroomTicket}
                  </div>
                </div>
              )}
            </div>

            {resources.length > 0 && (
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  Allocated Resources
                </h2>
                <div className="space-y-3">
                  {resources.map((res) => (
                    <div
                      key={res.id}
                      className="bg-blue-50 rounded-lg p-4 border border-blue-100"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <Radio size={16} className="text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900 text-sm">
                            {res.resourceName}
                          </div>
                          <div className="text-xs text-slate-600 mt-1">
                            {res.resourceType} assigned, audio levels tested
                          </div>
                          <div className="text-xs text-blue-600 mt-2">
                            Allocated by {res.assignedBy} •{' '}
                            {new Date(res.assignedAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Metadata
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <User size={14} />
                    <span>Created by</span>
                  </div>
                  <div className="text-sm font-medium text-slate-900">
                    {request.createdBy}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <Clock size={14} />
                    <span>Created at</span>
                  </div>
                  <div className="text-sm text-slate-900">
                    {new Date(request.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                    {new Date(request.createdAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <Clock size={14} />
                    <span>Last updated</span>
                  </div>
                  <div className="text-sm text-slate-900">
                    {new Date(request.updatedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                    {new Date(request.updatedAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Workflow History
              </h2>
              <div className="space-y-4">
                {transitions.length === 0 ? (
                  <div className="text-sm text-slate-500">No transitions yet</div>
                ) : (
                  transitions.map((trans, idx) => (
                    <div key={trans.id} className="relative pl-6">
                      <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-blue-500"></div>
                      {idx < transitions.length - 1 && (
                        <div className="absolute left-[3px] top-3 w-0.5 h-full bg-slate-200"></div>
                      )}
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {trans.toStatus}
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          by {trans.changedBy} •{' '}
                          {new Date(trans.changedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                          ,{' '}
                          {new Date(trans.changedAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        {trans.comment && (
                          <div className="text-xs text-slate-600 mt-1">
                            {trans.comment}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Notifications
              </h2>
              <div className="space-y-3">
                {transitions.slice(0, 2).map((trans) => (
                  <div
                    key={trans.id}
                    className="bg-blue-50 rounded p-3 border border-blue-100"
                  >
                    <div className="text-xs font-medium text-slate-600 mb-1">
                      To: {userRole}
                    </div>
                    <div className="text-sm text-slate-900">
                      {trans.comment || `Status changed to ${trans.toStatus}`}
                    </div>
                  </div>
                ))}
                {transitions.length === 0 && (
                  <div className="text-sm text-slate-500">No notifications</div>
                )}
              </div>
            </div>

            {showActions && userRole === 'Ingest' && (
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  Actions
                </h2>
                <IngestActions request={request} onAction={handleIngestAction} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
