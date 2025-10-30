import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { WorkflowForm } from './WorkflowForm';
import { RequestList } from './RequestList';
import { AdminDashboard } from './AdminDashboard';
import { mockApi } from '../services/mockApi';
import type { UserRole, WorkflowRequest, WorkflowStatus } from '../types/workflow';

interface RoleViewProps {
  role: UserRole;
}

export const RoleView: React.FC<RoleViewProps> = ({ role }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [requests, setRequests] = useState<WorkflowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const showForm = location.pathname.includes('/new');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await mockApi.getRequests();
      setRequests(data);
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (data: Partial<WorkflowRequest>, status: WorkflowStatus) => {
    try {
      await mockApi.createRequest(data, status);
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
