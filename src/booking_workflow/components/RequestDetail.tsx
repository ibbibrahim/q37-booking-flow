import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Clock, User, FileText, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import type {
  WorkflowRequest,
  WorkflowTransition,
  ResourceAssignment,
  UserRole,
} from '../types/workflow';
import { mockApi } from '../services/mockApi';
import { NOCActions } from './NOCActions';
import { IngestActions } from './IngestActions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
        <Button
          onClick={() => navigate(-1)}
          className="mt-4"
        >
          Go Back
        </Button>
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
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
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

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      'Submitted': 'bg-blue-100 text-blue-800',
      'With NOC': 'bg-yellow-100 text-yellow-800',
      'With Ingest': 'bg-purple-100 text-purple-800',
      'Completed': 'bg-green-100 text-green-800',
      'Clarification Requested': 'bg-orange-100 text-orange-800',
      'Rejected': 'bg-red-100 text-red-800',
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const priorityMap: Record<string, string> = {
      'High': 'bg-red-100 text-red-700',
      'Medium': 'bg-yellow-100 text-yellow-700',
      'Low': 'bg-green-100 text-green-700',
    };
    return priorityMap[priority] || 'bg-gray-100 text-gray-700';
  };

  const transitions = request.transitions || [];
  const parsedResources: ResourceAssignment[] = request.nocAssignedResources
  ? JSON.parse(request.nocAssignedResources)
  : [];
  const parsedTypeSpecific =
  request.typeSpecificData ? JSON.parse(request.typeSpecificData) : null;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="px-6">
        <div className="flex items-center gap-4">
          {/* Back button using shared Button */}
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1">
            {/* Title + status badge row */}
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">{request.title}</h1>
              <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
            </div>

            {/* ID / booking type / priority row */}
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">{request.id}</span>
              <span>·</span>
              <Badge variant="outline">{request.bookingType}</Badge>
              {request.priority && (
                <>
                  <span>·</span>
                  <Badge className={getPriorityColor(request.priority)}>{request.priority}</Badge>
                </>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Main Content */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Column */}
          <div className={showActions && userRole === 'NOC' ? 'lg:col-span-2 space-y-6' : 'lg:col-span-2 space-y-6'}>
            {/* Request Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText size={20} />
                  Request Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderField('Program / Segment', request.program)}
                  {renderField('Language', request.language)}
                  {renderField(request.bookingType === "Download and Ingest" || request.bookingType === "Camera Card and Ingest" ? "Ingest Time" 
                    : "Air Date / Time", new Date(request.airDateTime).toLocaleString())}
                  {request.feedStartTime && renderField("Feed Start Time", new Date(request.feedStartTime).toLocaleString())}
                  {request.feedEndTime && renderField("Feed End Time", new Date(request.feedEndTime).toLocaleString())}
                  {renderField('Studio', request.studio)}
                </div>

                {parsedTypeSpecific && (
                  <div className="pt-6 border-t border-border">
                    <h3 className="text-sm font-semibold text-card-foreground mb-4">
                    {request.bookingType === "Invite Guest for News" ||
                      request.bookingType === "Invite Guest for Program"
                        ? "Guest Information"
                        : request.bookingType === "Download and Ingest"
                        ? "Download Details"
                        : request.bookingType === "Camera Card and Ingest"
                        ? "Camera Card Details"
                        : "Additional Details"}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                <div className="pt-6 border-t border-border">
                  <h3 className="text-sm font-semibold text-card-foreground mb-3">
                    Resources Needed
                  </h3>
                  <div className="text-sm text-card-foreground">
                    {request.resourcesNeeded || 'None specified'}
                  </div>
                </div>

                {request.notes && (
                  <div className="pt-6 border-t border-border">
                    <h3 className="text-sm font-semibold text-card-foreground mb-3">Notes</h3>
                    <div className="bg-muted rounded p-3 text-sm text-muted-foreground">
                      {request.notes}
                    </div>
                  </div>
                )}

                {request.ingestFolderPath && (
                  <div className="pt-6 border-t border-border">
                    <h3 className="text-sm font-semibold text-card-foreground mb-3">
                      Ingest Folder Path
                    </h3>
                    <div className="text-sm font-mono text-muted-foreground bg-muted p-3 rounded">
                      {request.ingestFolderPath}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Allocated Resources */}
            {parsedResources.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Allocated Resources by NOC</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {parsedResources.map((res) => (
                      <div
                        key={res.id}
                        className="bg-blue-50 rounded-lg p-4 border border-blue-200"
                      >
                        <div className="flex items-start gap-3">
                          <CheckCircle2 size={16} className="text-blue-600 mt-1 flex-shrink-0" />
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
                </CardContent>
              </Card>
            )}

            {/* NOC Actions */}
            {showActions && userRole === 'NOC' && (
              <NOCActions request={request} onAction={handleNOCAction} />
            )}

            {/* Ingest Actions */}
            {showActions && userRole === 'Ingest' && (
              <IngestActions request={request} onAction={handleIngestAction} />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User size={20} />
                  Metadata
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Created by</div>
                  <div className="text-sm font-medium text-card-foreground">
                    {request.createdBy}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                    <Clock size={14} />
                    Created at
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
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                    <Clock size={14} />
                    Last updated
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
              </CardContent>
            </Card>

            {/* Workflow History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 size={20} />
                  Workflow History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transitions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No transitions yet</div>
                ) : (
                  <div className="space-y-4">
                    {transitions.map((trans, idx) => (
                      <div key={trans.id} className="relative pl-6">
                        <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-blue-500"></div>
                        {idx < transitions.length - 1 && (
                          <div className="absolute left-[3px] top-4 w-0.5 h-16 bg-border"></div>
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
                            <div className="text-xs text-muted-foreground mt-1 italic">{trans.comment}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle size={20} />
                  Recent Updates
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transitions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No notifications</div>
                ) : (
                  <div className="space-y-3">
                    {transitions.slice(0, 3).map((trans) => (
                      <div
                        key={trans.id}
                        className="bg-muted rounded p-3 border border-border text-sm"
                      >
                        <div className="font-medium text-card-foreground">
                          {trans.toStatus}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {trans.comment || `Status changed to ${trans.toStatus}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
