import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Clock, User, FileText, CheckCircle2, AlertCircle, Edit, Copy, ExternalLink, FolderOpen } from 'lucide-react';
import {
  getBookingTypeLabel,
  type WorkflowRequest,
  type UserRole,
  type DownloadLinkDto,
} from '../types/workflow';
import { mockApi } from '../services/bookingApi';
import { NOCActions } from './NOCActions';
import { IngestActions } from './IngestActions';
import { UpdateDownloadLinkModal } from './UpdateDownloadLinkModal';
import { BookingApi } from '../services/booking';
import { formatBookingStoredDateTime } from '@/studio_booking/utils/timeUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/contexts/ToastContext';
import { useSignalR } from '@/contexts/SignalRContext';

export const RequestDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { listen, isConnected } = useSignalR();

  const [request, setRequest] = useState<WorkflowRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLink, setSelectedLink] = useState<DownloadLinkDto | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

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

  useEffect(() => {
    if (!isConnected || !id) {
      return;
    }

    const unsubscribeRequestChanged = listen('RequestChanged', (changedRequest: WorkflowRequest) => {
      if (changedRequest.id === id) {
        setRequest(changedRequest);
      }
    });

    return () => {
      unsubscribeRequestChanged();
    };
  }, [isConnected, listen, id]);

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

    if (action === 'acknowledge') {
      await mockApi.acknowledgeRequest(request.id, data);
    } else {
      await mockApi.updateIngestAction(request.id.toString(), data);
    }

    const updated = await mockApi.getRequestById(request.id);
    if (updated) setRequest(updated);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('URL copied to clipboard', 'success');
  };

  const handleOpenUpdateModal = (link: DownloadLinkDto) => {
    setSelectedLink(link);
    setIsUpdateModalOpen(true);
  };

  const handleUpdateDownloadLink = async (linkId: number, ingestStatus: string, ingestNotes: string) => {
    if (!request) return;

    try {
      const updatedRequest = await mockApi.updateDownloadLink(
        request.id,
        linkId,
        { ingestStatus, ingestNotes }
      );
      setRequest(updatedRequest);
      showToast('Download link updated successfully', 'success');
    } catch (error) {
      console.error('Failed to update download link:', error);
      showToast('Failed to update download link', 'error');
      throw error;
    }
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
  const nocResources = request.nocResources || [];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="px-6">
        <div className="flex items-center gap-4">
          {/* Back button using shared Button */}
          <Button variant="outline" size="icon" onClick={() => navigate(`/${userRole.toLowerCase()}`)}>
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
              <Badge variant="outline">{getBookingTypeLabel(request.bookingType)}</Badge>
              {request.priority && (
                <>
                  <span>·</span>
                  <Badge className={getPriorityColor(request.priority)}>{request.priority}</Badge>
                </>
              )}
            </div>
          </div>

          {/* Edit Button for Booking Users */}
          {userRole === 'Booking' &&
            request.status !== 'Completed' &&
            request.status !== 'Cancelled' &&
            request.status !== 'Clarification Requested' && (
            <Button
              onClick={() => navigate(`/booking/edit/${request.id}`)}
              className="flex items-center gap-2"
            >
              <Edit size={16} />
              Edit Request
            </Button>
          )}
        </div>
      </div>


      {/* Main Content */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Column */}
          <div className={showActions && userRole === 'NOC' ? 'lg:col-span-2 space-y-6' : 'lg:col-span-2 space-y-6'}>
            {/* Prominent Ingest Info Banner */}
            {(request.ingestFolderPath || request.ingestNotes) && (
              <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 shadow-sm">
                <CardContent className="pt-5 space-y-4">
                  {request.ingestFolderPath && (
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 tracking-wide mb-2">
                        <FolderOpen className="h-4 w-4" />
                        Avid MediaCentral Path
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertCircle className="h-3.5 w-3.5 text-blue-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>Your requested videos have been ingested and are available at this path in Avid MediaCentral.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="relative group flex items-start gap-3">
                        <div className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all leading-relaxed flex-1">
                          {request.ingestFolderPath.split('/').map((segment, index, array) => (
                            <React.Fragment key={index}>
                              <span className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                {segment}
                              </span>
                              {index < array.length - 1 && (
                                <span className="text-blue-400 dark:text-blue-600 mx-0.5">/</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(request.ingestFolderPath!)}
                          className="h-8 px-2 flex-shrink-0"
                          title="Copy path"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {request.ingestNotes && (
                    <div className={request.ingestFolderPath ? 'pt-4 border-t border-blue-200 dark:border-blue-700' : ''}>
                      <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 tracking-wide mb-2">
                        <FileText className="h-4 w-4" />
                        Notes from MCR Team
                      </div>
                      <div className="text-sm text-gray-900 dark:text-gray-100">{request.ingestNotes}</div>
                    </div>
                  )}

                </CardContent>
              </Card>
            )}

            {/* Clarification Alert for Booking Users */}
            {request.status === 'Clarification Requested' && userRole === 'Booking' && (
              <Alert variant="destructive" className="border-orange-500 bg-orange-50 dark:bg-orange-900/20">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <AlertCircle className="h-5 w-5 mt-0.5 text-orange-600 dark:text-orange-400" />
                    <div>
                      <AlertTitle className="text-base font-semibold mb-2 text-orange-900 dark:text-orange-100">
                        Clarification Requested by NOC
                      </AlertTitle>
                      <AlertDescription className="text-sm text-orange-800 dark:text-orange-200">
                        {request.nocClarification || 'NOC has requested clarification on this request. Please review and update the request with the required information.'}
                      </AlertDescription>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate(`/booking/edit/${request.id}`)}
                    className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white flex-shrink-0"
                    size="sm"
                  >
                    <Edit size={16} />
                    Edit Request
                  </Button>
                </div>
              </Alert>
            )}

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
                  {/* {renderField('Language', request.language)} */}
                  {!(request.bookingType === "Download and Ingest" || request.bookingType === "Camera Card and Ingest") &&
                    renderField("Air Date / Time", formatBookingStoredDateTime(request.airDateTime))}
                  {request.feedStartTime && renderField("Feed Start Time", formatBookingStoredDateTime(request.feedStartTime))}
                  {request.feedEndTime && renderField("Feed End Time", formatBookingStoredDateTime(request.feedEndTime))}
                  {renderField('Studio', request.studio)}
                </div>

                {((request.bookingType === "Invite Guest for News" || request.bookingType === "Invite Guest for Program") && request.guestDetail) ||
                 (request.bookingType === "Download and Ingest" && request.downloadLinks && request.downloadLinks.length > 0) ||
                 (request.bookingType === "Camera Card and Ingest" && request.cameraCardDetail) ? (
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

                    {request.bookingType === "Invite Guest for News" ||
                    request.bookingType === "Invite Guest for Program" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {request.guestDetail && (
                          <>
                            {renderField("Guest or Reporter Name", request.guestDetail.guestName)}
                            {renderField("Guest or Reporter Contact", request.guestDetail.guestContact)}
                          </>
                        )}
                      </div>
                    ) : request.bookingType === "Download and Ingest" && request.downloadLinks ? (
                      <div className="rounded-md border">
                        <TooltipProvider>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[100px]">Source</TableHead>
                                <TableHead>URL</TableHead>
                                <TableHead className="w-[120px]">Status</TableHead>
                                <TableHead className="w-[200px]">Notes</TableHead>
                                {/* <TableHead className="w-[120px]">Updated By</TableHead> */}
                                <TableHead className="w-[100px] text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                            {request.downloadLinks.map((link, index) => {
                              const getStatusColor = (status: string) => {
                                switch (status) {
                                  case 'Done':
                                    return 'bg-green-100 text-green-700 border-green-200';
                                  case 'In Progress':
                                  case 'In-Progress':
                                    return 'bg-blue-100 text-blue-700 border-blue-200';
                                  case 'Failed':
                                    return 'bg-red-100 text-red-700 border-red-200';
                                  default:
                                    return 'bg-gray-100 text-gray-700 border-gray-200';
                                }
                              };

                              return (
                                <TableRow key={link.id || index}>
                                  <TableCell>
                                    <Badge variant="secondary">{link.source}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <a
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline flex items-center gap-2 break-all"
                                    >
                                      <span className="truncate max-w-[200px]">{link.url}</span>
                                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                    </a>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={getStatusColor(link.ingestStatus)}>
                                      {link.ingestStatus}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {link.ingestNotes && link.ingestNotes.length > 50 ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="text-sm text-muted-foreground cursor-help hover:text-foreground transition-colors">
                                            {link.ingestNotes.substring(0, 50)}...
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-md">
                                          <p>{link.ingestNotes}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <span className="text-sm text-muted-foreground">
                                        {link.ingestNotes || '-'}
                                      </span>
                                    )}
                                  </TableCell>
                                  {/* <TableCell>
                                    <span className="text-sm text-muted-foreground">
                                      {link.updatedBy ? `#${link.updatedBy}` : '-'}
                                    </span>
                                  </TableCell> */}
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(link.url)}
                                        className="h-8 px-2"
                                        title="Copy URL"
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                      {userRole === 'Ingest' && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleOpenUpdateModal(link)}
                                          className="h-8 px-2"
                                          title="Update Status"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            </TableBody>
                          </Table>
                        </TooltipProvider>
                      </div>
                    ) : request.bookingType === "Camera Card and Ingest" && request.cameraCardDetail ? (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Type</TableHead>
                              <TableHead className="text-right">Quantity</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">Video Quantity</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary">{request.cameraCardDetail.videoQuantity}</Badge>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Audio Quantity</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary">{request.cameraCardDetail.audioQuantity}</Badge>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    ) : null}
                  </div>
                ) : null}

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
                    <h3 className="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-amber-500" />
                      Notes from Requester
                    </h3>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-900 dark:text-amber-100">
                      {request.notes}
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>

            {/* Allocated Resources */}
            {nocResources.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Allocated Resources by NOC</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {nocResources.map((res) => (
                      <div
                        key={res.id}
                        className="bg-blue-50 rounded-lg p-4 border border-blue-200"
                      >
                        <div className="flex items-start gap-3">
                          <CheckCircle2 size={16} className="text-blue-600 mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-semibold text-card-foreground text-sm">
                              {res.source}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {res.sourceType} - {res.resourceType}
                              {res.resolution && ` (${res.resolution})`}
                            </div>
                            <div className="text-xs text-blue-600 mt-2">
                              Allocated by {res.assignedByUser?.displayName} •{' '}
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
                    {request.createdByUser
                        ? `${request.createdByUser.displayName}${request.createdByUser.extensionNumber ? ` (Ext ${request.createdByUser.extensionNumber})` : ''}`
                        : request.createdBy}
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
                  <div className="space-y-3">
                    {transitions.map((trans, idx) => {
                      const changedAt = new Date(trans.changedAt);

                      const timeStr = changedAt.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      const dateStr = changedAt.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });

                      return (
                        <div
                          key={trans.id}
                          className="flex gap-3 text-sm"
                        >
                          {/* Time column */}
                          <div className="w-20 pt-0.5 text-xs text-muted-foreground text-right">
                            <div className="font-medium">{timeStr}</div>
                            <div className="text-[11px] text-muted-foreground/80">
                              {dateStr}
                            </div>
                          </div>

                          {/* Timeline column: dot + vertical line that stretches */}
                          <div className="flex flex-col items-center">
                            <span className="mt-1 h-2 w-2 rounded-full border border-blue-500 bg-background" />
                            {idx < transitions.length - 1 && (
                              <span className="flex-1 w-px bg-border" />
                            )}
                          </div>

                          {/* Content column */}
                          <div className="flex-1 pb-4">
                            <div className="text-sm font-semibold text-card-foreground">
                              {trans.comment}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                            by {trans.changedByUser
                                ? `${trans.changedByUser.displayName ?? trans.changedByUser.username}${trans.changedByUser.extensionNumber ? ` (Ext ${trans.changedByUser.extensionNumber})` : ''}`
                                : (trans.changedBy || 'System')}

                            </div>
                          </div>
                        </div>
                      );
                    })}
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

      {/* Update Download Link Modal */}
      {selectedLink && (
        <UpdateDownloadLinkModal
          link={selectedLink}
          isOpen={isUpdateModalOpen}
          onClose={() => {
            setIsUpdateModalOpen(false);
            setSelectedLink(null);
          }}
          onSave={handleUpdateDownloadLink}
        />
      )}
    </div>
  );
};
