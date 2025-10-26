import React, { useState, useEffect } from 'react';
import { RoleSelector } from '../../booking_workflow/components/RoleSelector';
import { WorkflowForm } from '../../booking_workflow/components/WorkflowForm';
import { RequestList } from '../../booking_workflow/components/RequestList';
import { AdminDashboard } from '../../booking_workflow/components/AdminDashboard';
import { mockApi } from '../../booking_workflow/services/mockApi';
import type { UserRole, WorkflowRequest, WorkflowStatus } from '../../booking_workflow/types/workflow';
import { Tv } from 'lucide-react';

export const BookingDashboard: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<UserRole>('Booking');
  const [requests, setRequests] = useState<WorkflowRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

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
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create request:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Tv size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Live Business Channel</h1>
                <p className="text-sm text-slate-600">Booking Workflow: Booking → NOC → Ingest</p>
              </div>
            </div>
          </div>
          <RoleSelector currentRole={currentRole} onRoleChange={setCurrentRole} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {currentRole === 'Admin' ? (
              <AdminDashboard requests={requests} />
            ) : showForm ? (
              <WorkflowForm
                onSubmit={handleCreateRequest}
                onCancel={() => setShowForm(false)}
              />
            ) : (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    {currentRole} Dashboard
                  </h2>
                  <p className="text-slate-600">
                    {currentRole === 'Booking' && 'Create and manage workflow requests'}
                    {currentRole === 'NOC' && 'Review requests and assign resources'}
                    {currentRole === 'Ingest' && 'Process final stage workflow requests'}
                  </p>
                </div>
                <RequestList
                  requests={requests}
                  userRole={currentRole}
                  onCreateNew={() => setShowForm(true)}
                  onUpdate={loadRequests}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
