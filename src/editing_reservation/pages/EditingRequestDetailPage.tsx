import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, XCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useSignalR } from '@/contexts/SignalRContext';
import { editingApi } from '../api/editingApi';
import { EditingRequestDetail } from '../components/EditingRequestDetail';
import { getEditingStatusBadgeClass, getEditingStatusDisplayLabel } from '../utils/editingUtils';
import type { EditingRequest } from '../types/editing';

export const EditingRequestDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { listen, isConnected } = useSignalR();
  const [request, setRequest] = useState<EditingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const isBooking = user?.roles?.includes('Booking') || user?.roles?.includes('Admin');
  const isEditor = user?.roles?.includes('Editor') || user?.roles?.includes('Admin');
  const isSuperEditor = user?.roles?.includes('SuperEditor') || user?.roles?.includes('Admin');

  /** Back destination: editors go to editor-queue; booking/admin go to editing list */
  const getBackRoute = () => (isEditor && !isBooking ? '/editor-queue' : '/editing');
  const isCancelled = request?.status === 'Cancelled';
  const isCompleted = request?.status === 'Completed';
  const canEdit = isBooking && !isCancelled && !isCompleted;
  /** Only SuperEditor (or Admin) can do edit assignment; Editor role cannot assign. Includes Completed so they can edit session details. */
  const canAssign = isSuperEditor && ['Pending', 'Acknowledged', 'Completed'].includes(request?.status || '');
  const isAdmin = user?.roles?.includes('Admin');
  const isCreator = user?.id === request?.createdBy;
  /** Cancel: Admin always; Booking only if they created the request. Shown even when Completed. */
  const canCancel = !isCancelled && ((isAdmin) || (isBooking && isCreator));

  const loadRequest = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await editingApi.getById(Number(id));
      setRequest(data);
    } catch (error) {
      console.error('Failed to load edit reservation:', error);
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  useEffect(() => {
    if (!isConnected || !id) return;

    const unsubscribe = listen('EditingRequestUpdated', (data: EditingRequest) => {
      if (data.id === Number(id)) {
        setRequest(data);
      }
    });

    const unsubscribeCancelled = listen('EditingRequestCancelled', (data: EditingRequest) => {
      if (data.id === Number(id)) {
        setRequest(data);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeCancelled();
    };
  }, [isConnected, listen, id]);

  const handleAssignSuccess = () => {
    loadRequest();
  };

  const handleCancelRequest = async () => {
    if (!request || cancellationReason.trim().length < 20) return;

    setIsCancelling(true);
    try {
      await editingApi.cancel(request.id, {
        cancellationReason: cancellationReason.trim(),
      });
      showToast('Edit reservation cancelled', 'success');
      setShowCancelDialog(false);
      setCancellationReason('');
      loadRequest();
    } catch (error: unknown) {
      console.error('Failed to cancel:', error);
      const err = error as { response?: { data?: { error?: string } } };
      showToast(err.response?.data?.error || 'Failed to cancel', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!request) return;

    try {
      await editingApi.updateStatus(request.id, { status: 'Completed' });
      showToast('Edit reservation marked as completed', 'success');
      loadRequest();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      showToast(err.response?.data?.error || 'Failed to update status', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Edit reservation not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(getBackRoute())}>
          Back to List
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start gap-4">
        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => navigate(getBackRoute())}
        >
          <ArrowLeft size={20} />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-card-foreground">{request.programName}</h1>
            <Badge className={getEditingStatusBadgeClass(request.status)}>{getEditingStatusDisplayLabel(request.status)}</Badge>
          </div>
          <p className="text-sm text-muted-foreground font-mono">#{request.id}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Button
              variant="default"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                navigate(`/editing/${request.id}/edit`, { state: { editData: request } })
              }
            >
              <Edit size={16} />
              Edit
            </Button>
          )}
          {/* {isSuperEditor && canAssign && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleMarkCompleted}>
              <Check size={16} />
              Mark Completed
            </Button>
          )} */}
          {canCancel && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowCancelDialog(true)}
            >
              <XCircle size={16} />
              Cancel Request
            </Button>
          )}
        </div>
      </div>

      <EditingRequestDetail
        request={request}
        canAssign={canAssign}
        onAssignSuccess={handleAssignSuccess}
        currentUserId={user?.id}
        isSuperEditor={isSuperEditor}
        isAdmin={user?.roles?.includes('Admin')}
        onReportComplete={loadRequest}
      />

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Cancel Edit Reservation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancellation-reason">
                Cancellation Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="cancellation-reason"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Please provide a reason (minimum 20 characters)"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                {cancellationReason.length} / 20 characters minimum
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCancelDialog(false)} disabled={isCancelling}>
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelRequest}
                disabled={cancellationReason.trim().length < 20 || isCancelling}
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
