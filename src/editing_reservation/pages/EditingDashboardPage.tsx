import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSignalR } from '@/contexts/SignalRContext';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { editingApi } from '../api/editingApi';
import type { EditingRequest } from '../types/editing';
import { EditingWeeklySchedule } from '../components/EditingWeeklySchedule';
import { ManualBlockForm } from '../components/ManualBlockForm';
import { getSundayOfWeek, getWeekDates } from '../utils/scheduleUtils';

const ALLOWED_ROLES = ['Admin', 'Booking', 'Editor', 'SuperEditor'];

export const EditingDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { listen } = useSignalR();
  const [requests, setRequests] = useState<EditingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState<Date>(() =>
    getSundayOfWeek(new Date())
  );
  const [manualBlockModal, setManualBlockModal] = useState<'create' | 'edit' | null>(null);
  const [editingManualBlock, setEditingManualBlock] = useState<EditingRequest | null>(null);

  const hasAccess =
    user?.roles?.some((r) => ALLOWED_ROLES.includes(r)) ?? false;
  const canManageManualBlock =
    user?.roles?.includes('Admin') || user?.roles?.includes('SuperEditor') || false;

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const weekDates = getWeekDates(getSundayOfWeek(weekStart));
      const dateFrom = weekDates[0];
      const dateToEnd = new Date(weekDates[weekDates.length - 1]);
      dateToEnd.setHours(23, 59, 59, 999);
      const result = await editingApi.search({
        dateFrom,
        dateTo: dateToEnd,
        page: 1,
        pageSize: 100,
        includeManualBlocks: true,
      });
      setRequests(result.items ?? []);
    } catch (error) {
      console.error('Failed to load editing requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    if (!hasAccess) return;
    fetchRequests();
  }, [hasAccess, fetchRequests]);

  useEffect(() => {
    if (!hasAccess) return;

    const unsubUpdated = listen('EditingRequestUpdated', () => {
      fetchRequests();
    });
    const unsubCreated = listen('EditingRequestCreated', () => {
      fetchRequests();
    });

    return () => {
      unsubUpdated();
      unsubCreated();
    };
  }, [hasAccess, listen, fetchRequests]);

  const handlePreviousWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleThisWeek = () => {
    setWeekStart(getSundayOfWeek(new Date()));
  };

  const handleManualBlockSuccess = () => {
    setManualBlockModal(null);
    setEditingManualBlock(null);
    fetchRequests();
  };

  const handleEditManualBlock = (request: EditingRequest) => {
    setEditingManualBlock(request);
    setManualBlockModal('edit');
  };

  if (!user) {
    return null;
  }

  if (!hasAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="space-y-6">
      <EditingWeeklySchedule
        requests={requests}
        loading={loading}
        weekStart={weekStart}
        onPreviousWeek={handlePreviousWeek}
        onNextWeek={handleNextWeek}
        onThisWeek={handleThisWeek}
        canManageManualBlock={canManageManualBlock}
        onCreateManualBlock={
          canManageManualBlock ? () => setManualBlockModal('create') : undefined
        }
        onEditManualBlock={canManageManualBlock ? handleEditManualBlock : undefined}
      />

      <Dialog
        open={manualBlockModal !== null}
        onOpenChange={(open) => {
          if (!open) {
            setManualBlockModal(null);
            setEditingManualBlock(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <ManualBlockForm
            mode={manualBlockModal === 'edit' ? 'edit' : 'create'}
            initialRequest={editingManualBlock ?? undefined}
            onSuccess={handleManualBlockSuccess}
            onCancel={() => {
              setManualBlockModal(null);
              setEditingManualBlock(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
