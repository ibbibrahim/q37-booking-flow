import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { WorkflowForm } from './WorkflowForm';
import { RequestList } from './RequestList';
import { AdminDashboard } from './AdminDashboard';
import { mockApi } from '../services/bookingApi';
import { useSignalR } from '../../contexts/SignalRContext';
import type { UserRole, WorkflowRequest, WorkflowStatus } from '../types/workflow';

interface RoleViewProps {
  role: UserRole;
}

export const RoleView: React.FC<RoleViewProps> = ({ role }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { listen, isConnected } = useSignalR();
  const [listRefreshSignal, setListRefreshSignal] = useState(0);
  const showForm = location.pathname.includes('/new') || location.pathname.includes('/edit');
  const isEditMode = location.pathname.includes('/edit') && !!id;
  const [editRequest, setEditRequest] = useState<WorkflowRequest | null>(null);

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
    if (!isConnected) {
      return;
    }

    const unsubscribeRequestChanged = listen('RequestChanged', () => {
      setListRefreshSignal((n) => n + 1);
    });

    return () => {
      unsubscribeRequestChanged();
    };
  }, [isConnected, listen]);

  const bumpListRefresh = () => setListRefreshSignal((n) => n + 1);

  const handleCreateRequest = async (data: Partial<WorkflowRequest>, status: WorkflowStatus) => {
    try {
      await mockApi.createRequest(data, status);
      bumpListRefresh();
      navigate(`/${role.toLowerCase()}`);
    } catch (error) {
      console.error('Failed to create request:', error);
    }
  };

  const handleUpdateRequest = async (data: Partial<WorkflowRequest>, status: WorkflowStatus) => {
    if (!id) return;
    try {
      await mockApi.updateRequest(id, { ...data, status });
      bumpListRefresh();
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

  if (role === 'Admin') {
    return <AdminDashboard refreshSignal={listRefreshSignal} />;
  }

  return (
    <RequestList
      userRole={role}
      onCreateNew={() => navigate(`/${role.toLowerCase()}/new`)}
      refreshSignal={listRefreshSignal}
    />
  );
};
