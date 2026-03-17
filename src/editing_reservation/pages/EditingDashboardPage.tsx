import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSignalR } from '@/contexts/SignalRContext';
import { editingApi } from '../api/editingApi';
import type { EditingRequest } from '../types/editing';
import { EditingWeeklySchedule } from '../components/EditingWeeklySchedule';
import { getSundayOfWeek, getWeekDates } from '../utils/scheduleUtils';

const ALLOWED_ROLES = ['Admin', 'Booking', 'Editor'];

export const EditingDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { listen } = useSignalR();
  const [requests, setRequests] = useState<EditingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState<Date>(() =>
    getSundayOfWeek(new Date())
  );

  const hasAccess =
    user?.roles?.some((r) => ALLOWED_ROLES.includes(r)) ?? false;

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const weekDates = getWeekDates(getSundayOfWeek(weekStart));
      const dateFrom = weekDates[0];
      const dateTo = weekDates[weekDates.length - 1];
      const data = await editingApi.searchForDashboard(dateFrom, dateTo);
      setRequests(data);
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
      />
    </div>
  );
};
