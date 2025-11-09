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
  const [loading, setLoading] = useState(true);

  // Detect current user role from path
  const path = location.pathname.split('/')[1];
  const roleMap: Record<string, UserRole> = {
    booking: 'Booking',
    noc: 'NOC',
    ingest: 'Ingest',
    admin: 'Admin',
  };
  const userRole: UserRole = roleMap[path?.toLowerCase()] || 'Booking';

  useEffect(() => {
    const loadRequest = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await mockApi.getRequestById(id);
        if (data) {
          setRequest(data);
        }
      } catch (error) {
        console.error('Failed to fetch request details', error);
      } finally {
        setLoading(false);
      }
    };
    loadRequest();
  }, [id]);

  // const handleNOCAction = async (action: string, data: any) => {
  //   console.log('NOC Action:', action, data);
  //   if (!request) return;
  //   // await mockApi.assignNOCResources(request.id, data.newStatus, data, userRole);  
  //   debugger

  //   await mockApi.assignNOCResources(request.id, data);
  //   const updated = await mockApi.getRequestById(request.id);
  //   if (updated) setRequest(updated);
  // };

  const handleNOCAction = async (action: string, data: any) => {
    if (!request) return;
    console.log('NOC Action:', action, data);
  
    if (action === "acknowledge") {
      await mockApi.acknowledgeRequest(request.id, data);
    } else if (action === "send_to_ingest") {
      await mockApi.assignNOCResources(request.id, data);
    } else if (action === "request_clarification") {
      await mockApi.requestNOCClarification(request.id, data);
    }
  
    const updated = await mockApi.getRequestById(request.id);
    if (updated) setRequest(updated);
  };


  const handleIngestAction = async (action: string, data: any) => {
    if (!request) return;
  
    console.log('Ingest Action:', action, data);
  
    await mockApi.updateIngestAction(request.id.toString(), data);
  
    const updated = await mockApi.getRequestById(request.id);
    if (updated) setRequest(updated);
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
  
    // If it's a valid URL, render as clickable link
    const isUrl = /^https?:\/\//i.test(value);
  
    return (
      <div className="mb-4">
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <div className="text-sm text-card-foreground break-all">
          {isUrl ? (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {value}
            </a>
          ) : (
            value
          )}
        </div>
      </div>
    );
  };

  const transitions = request.transitions || [];
  const parsedResources: ResourceAssignment[] = request.nocAssignedResources
  ? JSON.parse(request.nocAssignedResources)
  : [];
  const parsedTypeSpecific =
  request.typeSpecificData ? JSON.parse(request.typeSpecificData) : null;


  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-card-foreground transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-card-foreground">{request.title}</h1>
              <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                {request.status}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
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
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-card-foreground mb-4">
                Request Details
              </h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {renderField('Program / Segment', request.program)}
                {renderField('Language', request.language)}
                {renderField(request.bookingType === "Download and Ingest" || request.bookingType === "Camera Card and Ingest" ? "Ingest Time" 
                  : "Air Date / Time", new Date(request.airDateTime).toLocaleString())}
                {request.feedStartTime && renderField("Feed Start Time", new Date(request.feedStartTime).toLocaleString())}
                {request.feedEndTime && renderField("Feed End Time", new Date(request.feedEndTime).toLocaleString())}
                {renderField('Studio', request.studio)}
              </div>

              {/* <div className="mt-6 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-card-foreground mb-3">
                  Feed Configuration
                </h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {request.bookingType === 'Incoming Feed' && 'sourceType' in request && (
                    <>
                      {renderField('Source Type', request.sourceType)}
                      {renderField('vMix Input', request.vmixInputNumber)}
                      {renderField('Return Path', request.returnPath)}
                      {renderField('Key/Fill', request.keyFill)}
                    </>
                  )}
                </div>
              </div> */}

              {parsedTypeSpecific && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="text-sm font-semibold text-card-foreground mb-3">
                  {request.bookingType === "Invite Guest for News" ||
                    request.bookingType === "Invite Guest for Program"
                      ? "Guest Information"
                      : request.bookingType === "Download and Ingest"
                      ? "Download Details"
                      : request.bookingType === "Camera Card and Ingest"
                      ? "Camera Card Details"
                      : ""}
                  </h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    {request.bookingType === "Invite Guest for News" ||
                    request.bookingType === "Invite Guest for Program" ? (
                      <>
                        {renderField("Guest Name", parsedTypeSpecific.guestName)}
                        {renderField("Guest Contact", parsedTypeSpecific.guestContact)}
                        {renderField("iNEWS Rundown ID", parsedTypeSpecific.inewsRundownId)}
                        {renderField("Story Slug", parsedTypeSpecific.storySlug)}
                        {renderField("Rundown Position", parsedTypeSpecific.rundownPosition)}
                      </>
                    ) : request.bookingType === "Download and Ingest" ? (
                      <>
                        {renderField("Download Source", parsedTypeSpecific.downloadSource)}
                        {renderField("Download Link", parsedTypeSpecific.downloadLink)}
                      </>
                    ) : request.bookingType === "Camera Card and Ingest" ? (
                      <>
                        {renderField("Camera Card Quantity", parsedTypeSpecific.cameraCardNumber)}
                      </>
                    ) : null}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-card-foreground mb-3">
                  Resources Needed
                </h3>
                <div className="text-sm text-card-foreground">
                  {request.resourcesNeeded || 'None specified'}
                </div>
              </div>

              {/* {true && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="text-sm font-semibold text-card-foreground mb-3">
                    Compliance Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                      {"request.complianceTags"}
                    </span>
                  </div>
                </div>
              )} */}

              {request.notes && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="text-sm font-semibold text-card-foreground mb-3">Notes</h3>
                  <div className="bg-muted rounded p-3 text-sm text-muted-foreground">
                    {request.notes}
                  </div>
                </div>
              )}

              {request.ingestFolderPath && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="text-sm font-semibold text-card-foreground mb-3">
                    Ingest Folder Path
                  </h3>
                  <div className="text-sm text-card-foreground">
                    {request.ingestFolderPath}
                  </div>
                </div>
              )}

              {/* {true && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="text-sm font-semibold text-card-foreground mb-3">
                    Newsroom Ticket
                  </h3>
                  <div className="text-sm text-card-foreground">{"request.newsroomTicket"}</div>
                </div>
              )} */}
            </div>

            {parsedResources.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-lg font-semibold text-card-foreground mb-4">
                  Allocated Resources by NOC
                </h2>
                <div className="space-y-3">
                  {parsedResources.map((res) => (
                    <div
                      key={res.id}
                      className="bg-blue-50 rounded-lg p-4 border border-blue-100"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <Radio size={16} className="text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-card-foreground text-sm">
                            {res.resourceName}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {res.type}
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
          <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-card-foreground mb-4">
                Metadata
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <User size={14} />
                    <span>Created by</span>
                  </div>
                  <div className="text-sm font-medium text-card-foreground">
                    {request.createdBy}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Clock size={14} />
                    <span>Created at</span>
                  </div>
                  <div className="text-sm text-card-foreground">
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
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Clock size={14} />
                    <span>Last updated</span>
                  </div>
                  <div className="text-sm text-card-foreground">
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
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-card-foreground mb-4">
                Workflow History
              </h2>
              <div className="space-y-4">
                {transitions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No transitions yet</div>
                ) : (
                  transitions.map((trans, idx) => (
                    <div key={trans.id} className="relative pl-6">
                      <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-blue-500"></div>
                      {idx < transitions.length - 1 && (
                        <div className="absolute left-[3px] top-3 w-0.5 h-full bg-border"></div>
                      )}
                      <div>
                        <div className="text-sm font-semibold text-card-foreground">
                          {trans.toStatus}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          by {trans.changedBy || 'System'} •{' '}
                          {new Date(trans.changedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })},{' '}
                          {new Date(trans.changedAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        {trans.comment && (
                          <div className="text-xs text-muted-foreground mt-1">{trans.comment}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-card-foreground mb-4">
                Notifications
              </h2>
              <div className="space-y-3">
                {transitions.slice(0, 2).map((trans) => (
                  <div
                    key={trans.id}
                    className="bg-muted rounded p-3 border border-border"
                  >
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      To: {userRole}
                    </div>
                    <div className="text-sm text-card-foreground">
                      {trans.comment || `Status changed to ${trans.toStatus}`}
                    </div>
                  </div>
                ))}
                {transitions.length === 0 && (
                  <div className="text-sm text-muted-foreground">No notifications</div>
                )}
              </div>
            </div>

            {showActions && userRole === 'Ingest' && (
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-lg font-semibold text-card-foreground mb-4">
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
