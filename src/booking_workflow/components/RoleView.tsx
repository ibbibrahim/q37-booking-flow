import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
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
  const { id } = useParams();
  const { listen, invoke, isConnected } = useSignalR();
  const [requests, setRequests] = useState<WorkflowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const showForm = location.pathname.includes('/new') || location.pathname.includes('/edit');
  const isEditMode = location.pathname.includes('/edit') && !!id;
  const [editRequest, setEditRequest] = useState<WorkflowRequest | null>(null);

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
    const loadEditRequest = async () => {
      if (isEditMode && id) {
        try {
          const request = await mockApi.getRequestById(id);
          if (request) {
            setEditRequest(request);
          }
        } catch (error) {
          console.error('Failed to load request for editing:', error);
        }
      }
    };
    loadEditRequest();
  }, [isEditMode, id]);

  useEffect(() => {
    // Don't subscribe if not connected
    if (!isConnected) {
      return;
    }

    const unsubscribeCreated = listen('RequestCreated', (newRequest: WorkflowRequest) => {
        newRequest.__isNew = true;
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

    // When Ingest marks a request as completed
    const unsubscribeCompleted = listen('RequestCompleted', (completedRequest: WorkflowRequest) => {
      completedRequest.__isNew = true;
      setRequests((prev) => {
        const exists = prev.some((r) => r.id === completedRequest.id);
        if (exists) {
          // Move to top and update
          return [completedRequest, ...prev.filter((r) => r.id !== completedRequest.id)];
        }
        return [completedRequest, ...prev];
      });
    });
    
    // When Ingest marks a request as NOT DONE
    const unsubscribeNotDone = listen('RequestNotDone', (notDoneRequest: WorkflowRequest) => {
      notDoneRequest.__isNew = true;
      setRequests((prev) => {
        const exists = prev.some((r) => r.id === notDoneRequest.id);
        if (exists) {
          return [notDoneRequest, ...prev.filter((r) => r.id !== notDoneRequest.id)];
        }
        return [notDoneRequest, ...prev];
      });
    });

    const unsubscribeResourcesAssigned = listen('ResourcesAssigned', (assignedRequest: WorkflowRequest) => {
      // Only Ingest should react to this event
      assignedRequest.__isNew = true;
      setRequests((prev) => {
        const exists = prev.some((r) => r.id === assignedRequest.id);
        if (exists) {
          // Replace existing entry (maybe moved from NOC)
          return prev.map((r) => (r.id === assignedRequest.id ? assignedRequest : r));
        }
        // Add new item at top
        return [assignedRequest, ...prev];
      });
    });
    

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeCompleted();
      unsubscribeResourcesAssigned();
      unsubscribeNotDone();
    };
  }, [isConnected, listen]);

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

  const handleUpdateRequest = async (data: Partial<WorkflowRequest>, status: WorkflowStatus) => {
    if (!id) return;
    try {
      const updatedRequest = await mockApi.updateRequest(id, { ...data, status });
      await loadRequests();
      navigate(`/${role.toLowerCase()}/requests/${id}`);
    } catch (error) {
      console.error('Failed to update request:', error);
    }
  };

  if (showForm) {
    if (isEditMode && !editRequest) {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }
    return (
      <WorkflowForm
        onSubmit={isEditMode ? handleUpdateRequest : handleCreateRequest}
        onCancel={() => navigate(isEditMode && id ? `/${role.toLowerCase()}/requests/${id}` : `/${role.toLowerCase()}`)}
        initialData={isEditMode ? editRequest : undefined}
        isEditMode={isEditMode}
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