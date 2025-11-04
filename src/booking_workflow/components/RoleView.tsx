import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { WorkflowForm } from './WorkflowForm';
import { RequestList } from './RequestList';
import { AdminDashboard } from './AdminDashboard';
import { mockApi } from '../services/mockApi';
import { useSignalR } from '../../contexts/SignalRContext';
import type { UserRole, WorkflowRequest, WorkflowStatus } from '../types/workflow';

interface RoleViewProps {
  role: UserRole;
}

export const RoleView: React.FC<RoleViewProps> = ({ role }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { listen, invoke } = useSignalR();
  const [requests, setRequests] = useState<WorkflowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const showForm = location.pathname.includes('/new');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await mockApi.getRequests();
      setRequests(data);
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    const unsubscribeCreated = listen('RequestCreated', (newRequest: WorkflowRequest) => {
        setRequests((prev) => {
          const exists = prev.some((r) => r.id === newRequest.id);
          if (exists) return prev;
          return [newRequest, ...prev];
        });
    });

    const unsubscribeUpdated = listen('RequestUpdated', (updatedRequest: WorkflowRequest) => {
      setRequests((prev) =>
        prev.map((r) => (r.id === updatedRequest.id ? updatedRequest : r))
      );
    });

    const unsubscribeCompleted = listen('RequestCompleted', (completedRequest: WorkflowRequest) => {
      setRequests((prev) =>
        prev.map((r) => (r.id === completedRequest.id ? completedRequest : r))
      );
    });

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeCompleted();
    };
  }, [listen]);

  const handleCreateRequest = async (data: Partial<WorkflowRequest>, status: WorkflowStatus) => {
    try {
      const newRequest = await mockApi.createRequest(data, status);
      // await invoke('RequestCreated', newRequest);
      await loadRequests();
      navigate(`/${role.toLowerCase()}`);
    } catch (error) {
      console.error('Failed to create request:', error);
    }
  };

  if (showForm) {
    return (
      <WorkflowForm
        onSubmit={handleCreateRequest}
        onCancel={() => navigate(`/${role.toLowerCase()}`)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (role === 'Admin') {
    return <AdminDashboard requests={requests} />;
  }

  return (
    <RequestList
      requests={requests}
      userRole={role}
      onCreateNew={() => navigate(`/${role.toLowerCase()}/new`)}
      onUpdate={loadRequests}
    />
  );
};
