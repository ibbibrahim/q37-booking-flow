import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Clock, User, FileText, Mail, Edit, Copy, Check, Minus, XCircle, AlertTriangle, Info, Users, Package, DatabaseIcon } from 'lucide-react';
import { callSheetApi } from '../services/mockCallSheetApi';
import { useAuth } from '@/contexts/AuthContext';
import { useSignalR } from '@/contexts/SignalRContext';
import { CallSheetForm } from './CallSheetForm';
import { CallSheetEmailModal } from './CallSheetEmailModal';
import { CancelCallSheetModal } from './CancelCallSheetModal';
import { UnifiedWorkflowDocument, getPrintStyles } from './UnifiedWorkflowDocument';
import type { CallSheetRequest } from '../types/callsheet';
import { formatQatarDateTime } from '../utils/timezone';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDateTime, formatTime } from '@/studio_booking/utils/timeUtils';
import { useToast } from '@/hooks/use-toast';

export const CallSheetDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { listen, isConnected } = useSignalR();
  const { toast } = useToast();
  const [callSheet, setCallSheet] = useState<CallSheetRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Check if user has TechnicalStore role
  const isTechnicalStore = user?.roles?.includes('TechnicalStore') || false;

  // Check if user has CallSheet role
  const hasCallSheetRole = user?.roles?.includes('Callsheet') || false;

  useEffect(() => {
    const loadCallSheet = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await callSheetApi.getCallSheetById(Number(id));
        if (data) {
          setCallSheet(data);
        }
      } catch (error) {
        console.error('Failed to load call sheet:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCallSheet();
  }, [id]);

  // SignalR listeners for real-time updates
  useEffect(() => {
    if (!isConnected || !id) {
      return;
    }

    // Listen for updates to this specific call sheet
    const unsubscribeUpdatedByTechnicalStore = listen('CallSheetUpdatedByTechnicalStore', (updatedCallSheet: CallSheetRequest) => {
      // Only update if it's the call sheet we're currently viewing
      if (updatedCallSheet.id === Number(id)) {
        console.log('Current call sheet updated by Technical Store:', updatedCallSheet);
        setCallSheet(updatedCallSheet);
      }
    });

    return () => {
      unsubscribeUpdatedByTechnicalStore();
    };
  }, [isConnected, listen, id]);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>QMC Workflow - Unified Forms</title>
          <style>
            ${getPrintStyles()}
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!callSheet) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Call sheet not found</p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    'Draft': 'bg-slate-100 text-slate-700',
    'Pending Approval': 'bg-yellow-100 text-yellow-700',
    'Approved': 'bg-green-100 text-green-700',
    'In Progress': 'bg-blue-100 text-blue-700',
    'Completed': 'bg-purple-100 text-purple-700',
    'Cancelled': 'bg-red-100 text-red-700'
  };

  // Handler for Technical Store update
  const handleTechnicalStoreSubmit = async (data: Partial<CallSheetRequest>) => {
    if (!id) return;

    try {
      const updateData = {
        driverName: data.transportRequest?.driverName || '',
        driverNo: data.transportRequest?.driverNo || '',
        equipment: data.equipment || []
      };

      await callSheetApi.updateTechnicalStore(Number(id), updateData);
      alert('Driver and equipment updated successfully');
      navigate('/callsheet');
    } catch (error) {
      console.error('Failed to update technical store data:', error);
      alert('Failed to update. Please try again.');
    }
  };

  // If TechnicalStore user and the call sheet is not yet completed, render the editable form
  if (isTechnicalStore && callSheet.status !== 'Completed') {
    return (
      <CallSheetForm
        initialCallSheet={callSheet || undefined}
        mode="technicalStore"
        onSubmit={handleTechnicalStoreSubmit}
      />
    );
  }

  const isCancelled = callSheet.status === 'Cancelled';
  const isStoreCompleted = callSheet.status === 'Completed';

  return (
    <div className="max-w-6xl mx-auto">
      {isCancelled && (
        <div className="px-6 mb-4">
          <div className="bg-destructive/10 border-2 border-destructive rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-destructive mb-1">CALL SHEET CANCELLED</h2>
                {callSheet.cancellationReason && (
                  <div className="mt-2">
                    <p className="text-sm font-semibold text-foreground mb-1">Cancellation Reason:</p>
                    <p className="text-sm text-muted-foreground">{callSheet.cancellationReason}</p>
                  </div>
                )}
                {callSheet.cancelledAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Cancelled on: {new Date(callSheet.cancelledAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 mb-6">
        <div className="flex gap-4">
          {/* Back button */}
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 mt-1"
            onClick={() => navigate('/callsheet')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {/* Title block + all actions */}
          <div className="flex-1 min-w-0">

            {/* Top: title/badges left, destructive/export actions right */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap mb-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{callSheet.title}</h1>
                  <Badge className={statusColors[callSheet.status]}>{callSheet.status}</Badge>
                  {callSheet.alreadyAnnouncedEmail ? (
                    <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center gap-1.5">
                      <Check className="h-3 w-3" />
                      Email Sent
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex items-center gap-1.5">
                      <Minus className="h-3 w-3" />
                      Email Not Sent
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-mono">{callSheet.id}</span>
                  <span>·</span>
                  <Badge variant="outline">{callSheet.department}</Badge>
                </div>
              </div>

              {/* Cancel + Download — top-right on desktop, full-width row on mobile */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {!isTechnicalStore && hasCallSheetRole && !isCancelled && (
                  <Button
                    onClick={() => setShowCancelModal(true)}
                    variant="destructive"
                    size="sm"
                    className="gap-1.5 flex-1 sm:flex-none"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Cancel Call Sheet
                  </Button>
                )}
                <Button onClick={handlePrint} size="sm" className="gap-1.5 flex-1 sm:flex-none">
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </Button>
              </div>
            </div>

            {/* Bottom: secondary actions — hidden for Technical Store users */}
            {!isTechnicalStore && (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Button
                  onClick={() => navigate(`/callsheet/edit/${callSheet.id}`, {
                    state: { editData: callSheet }
                  })}
                  variant="default"
                  size="sm"
                  className="gap-1.5"
                  disabled={isCancelled}
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  onClick={() => navigate('/callsheet/new', {
                    state: { duplicateData: callSheet }
                  })}
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={isCancelled}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate
                </Button>
              {hasCallSheetRole && (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                        <span className={(!isStoreCompleted || isCancelled) ? 'cursor-not-allowed' : undefined}>
                          <Button
                            onClick={() => setShowEmailModal(true)}
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            disabled={isCancelled || !isStoreCompleted}
                          >
                            <Mail className="h-3.5 w-3.5" />
                            Announce / Send Email
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!isStoreCompleted && !isCancelled && (
                        <TooltipContent side="bottom" className="max-w-xs text-center">
                          <div className="flex items-start gap-1.5">
                            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <p>Announcement emails can only be sent once the Technical Store has confirmed the call sheet. Current status: <strong>{callSheet.status}</strong></p>
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}

          </div>
        </div>
      </div>


      <div className="px-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-muted/30">
                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-base font-semibold text-card-foreground">Call Sheet Details</h2>
              </div>

              <div className="p-6 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Department</div>
                  <div className="text-card-foreground font-medium">{callSheet.department}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Start Date & Time</div>
                  <div className="text-card-foreground font-medium">
                    {formatDateTime(callSheet.startDateTime)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Return Date & Time</div>
                  <div className="text-card-foreground font-medium">
                    {formatDateTime(callSheet.returnDateTime)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Location</div>
                  <div className="text-card-foreground font-medium">{callSheet.location || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Focal Point</div>
                  <div className="text-card-foreground font-medium">{callSheet.focalPoint || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Contact</div>
                  <div className="text-card-foreground font-medium">{callSheet.focalPointContact || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Call Time</div>
                  <div className="text-card-foreground font-medium">
                    {formatTime(callSheet.startDateTime)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Wrap Time</div>
                  <div className="text-card-foreground font-medium">
                    {formatTime(callSheet.returnDateTime)}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Driver Needed</div>
                  <div className="text-card-foreground font-medium">{callSheet.driverNeeded ? 'Yes' : 'No'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Email Sent</div>
                  <div className="text-card-foreground font-medium">
                    {callSheet.alreadyAnnouncedEmail ? (
                      <span className="inline-flex items-center gap-1.5 text-green-700 dark:text-green-400">
                        <Check className="h-4 w-4" />
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Minus className="h-4 w-4" />
                        No
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {callSheet.crewAssignments.length > 0 && (
              <div className="bg-card rounded-lg border border-border overflow-hidden">
                <div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-muted/30">
                  <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <h2 className="text-base font-semibold text-card-foreground">Crew Assignments</h2>
                  <Badge variant="secondary" className="ml-auto text-xs">{callSheet.crewAssignments.length}</Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableHead className="w-[200px] font-semibold text-card-foreground">Role</TableHead>
                      <TableHead className="font-semibold text-card-foreground">Name</TableHead>
                      <TableHead className="font-semibold text-card-foreground">Phone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {callSheet.crewAssignments.map((crew) => (
                      <TableRow key={crew.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-medium border-primary/30 text-primary bg-primary/5">
                            {crew.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-card-foreground">{crew.name}</TableCell>
                        <TableCell className="text-muted-foreground">{crew.phone || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {callSheet.equipment.length > 0 && (
              <div className="bg-card rounded-lg border border-border overflow-hidden">
                <div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-muted/30">
                  <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <h2 className="text-base font-semibold text-card-foreground">Equipment List</h2>
                  <Badge variant="secondary" className="ml-auto text-xs">{callSheet.equipment.length} items</Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableHead className="w-[180px] font-semibold text-card-foreground">Category</TableHead>
                      <TableHead className="font-semibold text-card-foreground">Item</TableHead>
                      <TableHead className="w-[100px] text-center font-semibold text-card-foreground">Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {callSheet.equipment.map((eq) => (
                      <TableRow key={eq.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <Badge variant="secondary" className="text-xs font-medium uppercase tracking-wide">
                            {eq.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-card-foreground">{eq.item}</TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md bg-primary/10 text-primary text-sm font-semibold">
                            {eq.quantity}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {callSheet.driverNeeded && callSheet.transportRequest && (
              <div className="bg-card rounded-lg border border-border overflow-hidden">
                <div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-muted/30">
                  <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <h2 className="text-base font-semibold text-card-foreground">Transportation</h2>
                </div>
                <div className="p-6 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Reason</div>
                    <div className="text-card-foreground font-medium">{callSheet.transportRequest.reason}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Driver</div>
                    <div className="text-card-foreground font-medium">{callSheet.transportRequest.driverName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Driver Number</div>
                    <div className="text-card-foreground font-medium">{callSheet.transportRequest.driverNo}</div>
                  </div>
                  {/* <div>
                    <div className="text-xs text-muted-foreground mb-1">Requested By</div>
                    <div className="text-card-foreground font-medium">{callSheet.transportRequest.requestedBy}</div>
                  </div> */}
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Start Time</div>
                    <div className="text-card-foreground font-medium">
                      {new Date(callSheet.transportRequest.startDateTime).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Return Time</div>
                    <div className="text-card-foreground font-medium">
                      {new Date(callSheet.transportRequest.returnDateTime).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* {callSheet.departmentAcknowledgements.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-lg font-semibold text-card-foreground mb-4">Department Acknowledgements</h2>
                <div className="space-y-3">
                  {callSheet.departmentAcknowledgements.map((ack) => (
                    <div key={ack.department} className="p-3 bg-muted rounded-lg">
                      <h3 className="font-semibold text-card-foreground mb-1">{ack.department}</h3>
                      <div className="text-sm text-muted-foreground">
                        Acknowledged: {ack.acknowledged ? '✓ Yes' : '✗ No'} |
                        Approved: {ack.approved ? '✓ Yes' : '✗ No'}
                      </div>
                      {ack.comment && (
                        <div className="text-sm text-muted-foreground mt-1 italic">
                          Comment: {ack.comment}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )} */}
          </div>

          <div className="space-y-6">
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-muted/30">
                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
                  <DatabaseIcon className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-base font-semibold text-card-foreground">Metadata</h2>
              </div>
              <div className="p-6 space-y-4">
                {callSheet.createdByUser && (
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted shrink-0 mt-0.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-0.5">Created by</div>
                      <div className="text-sm font-medium text-card-foreground">
                        {callSheet.createdByUser.displayName || callSheet.createdByUser.username}
                      </div>
                      {callSheet.createdByUser.email && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {callSheet.createdByUser.email}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted shrink-0 mt-0.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Created at</div>
                    <div className="text-sm text-card-foreground">
                      {new Date(callSheet.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                {/* <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Clock size={14} />
                    <span>Last updated</span>
                  </div>
                  <div className="text-sm text-card-foreground">
                    {new Date(callSheet.updatedAt).toLocaleString()}
                  </div>
                </div> */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {callSheet && (
        <CallSheetEmailModal
          open={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          callSheet={callSheet}
          onSuccess={(updatedCallSheet) => {
            setCallSheet(updatedCallSheet);
            setShowEmailModal(false);
          }}
        />
      )}

      {callSheet && (
        <CancelCallSheetModal
          open={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          callSheet={callSheet}
          onSuccess={(updatedCallSheet) => {
            setCallSheet(updatedCallSheet);
            setShowCancelModal(false);
            toast({
              title: 'Call Sheet Cancelled',
              description: 'The call sheet has been successfully cancelled.',
            });
          }}
        />
      )}

      {callSheet && (
        <div ref={printRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <UnifiedWorkflowDocument callSheet={callSheet} />
        </div>
      )}
    </div>
  );
};
