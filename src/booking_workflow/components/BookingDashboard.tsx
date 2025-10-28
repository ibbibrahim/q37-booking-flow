import React, { useState, useEffect } from 'react';
import { WorkflowForm } from '../../booking_workflow/components/WorkflowForm';
import { RequestList } from '../../booking_workflow/components/RequestList';
import { AdminDashboard } from '../../booking_workflow/components/AdminDashboard';
import { mockApi } from '../../booking_workflow/services/mockApi';
import type { UserRole, WorkflowRequest, WorkflowStatus } from '../../booking_workflow/types/workflow';
import { User, Radio, Package, Shield, Menu, X, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export const BookingDashboard: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [currentRole, setCurrentRole] = useState<UserRole>('Booking');
  const [requests, setRequests] = useState<WorkflowRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const roleConfig = {
    Booking: { icon: User, label: 'Booking' },
    NOC: { icon: Radio, label: 'NOC' },
    Ingest: { icon: Package, label: 'Ingest' },
    Admin: { icon: Shield, label: 'Admin' }
  };

  const roles: UserRole[] = ['Booking', 'NOC', 'Ingest', 'Admin'];

  return (
    <>
      {!showForm && (
        <div className="min-h-screen bg-background flex">
          <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar-background border-r border-sidebar-border transform transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-auto ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            <div className="h-full flex flex-col">
              <div className="p-6 border-b border-sidebar-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://q37.qa/q37/images/logo_1.svg"
                      alt="Q37 Logo"
                      className="h-10 w-10 object-contain"
                    />
                    <div>
                      <h1 className="text-lg font-bold text-sidebar-foreground">Workflow Hub</h1>
                    </div>
                  </div>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="lg:hidden text-sidebar-foreground hover:text-sidebar-primary"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <nav className="flex-1 p-4">
                <div className="space-y-1">
                  {roles.map(role => {
                    const Icon = roleConfig[role].icon;
                    const isActive = currentRole === role;
                    return (
                      <button
                        key={role}
                        onClick={() => {
                          setCurrentRole(role);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          isActive
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent'
                        }`}
                      >
                        <Icon size={20} />
                        <span className="font-medium text-sm">{roleConfig[role].label}</span>
                      </button>
                    );
                  })}
                </div>
              </nav>

              <div className="p-4 border-t border-sidebar-border">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-sidebar-foreground hover:bg-sidebar-accent mb-3"
                >
                  {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                  <span className="font-medium text-sm">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                </button>
                <p className="text-xs text-sidebar-foreground opacity-60">HR Workflow: Booking → NOC → Ingest</p>
              </div>
            </div>
          </aside>

          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <div className="flex-1 flex flex-col min-w-0">
            <header className="bg-card border-b border-border sticky top-0 z-30">
              <div className="px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setSidebarOpen(true)}
                      className="lg:hidden text-card-foreground hover:text-primary"
                    >
                      <Menu size={24} />
                    </button>
                    <div>
                      <h2 className="text-xl font-bold text-card-foreground">
                        {currentRole}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {currentRole === 'Booking' && 'Create and manage workflow requests'}
                        {currentRole === 'NOC' && 'Review requests and assign resources'}
                        {currentRole === 'Ingest' && 'Process final stage workflow requests'}
                        {currentRole === 'Admin' && 'Full system access and analytics'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  {currentRole === 'Admin' ? (
                    <AdminDashboard requests={requests} />
                  ) : (
                    <RequestList
                      requests={requests}
                      userRole={currentRole}
                      onCreateNew={() => setShowForm(true)}
                      onUpdate={loadRequests}
                    />
                  )}
                </>
              )}
            </main>
          </div>
        </div>
      )}

      {showForm && (
        <WorkflowForm
          onSubmit={handleCreateRequest}
          onCancel={() => setShowForm(false)}
        />
      )}
    </>
  );
};
