import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import type { UserRole } from '../types/workflow';
import { User, Radio, Package, Shield, Menu, X, Sun, Moon, FileText, LogOut, UserCircle, BarChart3, Boxes, Video, Users, KeyRound, Film, Inbox, CalendarDays } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationDropdown } from '../../components/NotificationDropdown';
import { NotificationPermissionBanner } from '../../components/NotificationPermissionBanner';
import { NotificationSettings } from '../../components/NotificationSettings';
import qBusinessLogoDark from '../../assets/Qbusiness_Logo_NEG_POS-01.png';
import qBusinessLogoLight from '../../assets/Qbusiness_Logo_NEG_POS-02.png';
import { ChangePasswordModal } from './ChangePasswordModal';

export const BookingDashboard: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const getCurrentSection = (): string => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    if (pathParts[0] === 'admin' && pathParts[1] === 'users') {
      return 'admin-users';
    }
    if (pathParts[0] === 'rota') {
      return 'rota';
    }
    if (pathParts[0] === 'editing' && pathParts[1] === 'dashboard') {
      return 'editing-dashboard';
    }
    if (pathParts[0] === 'editing' || pathParts[0] === 'editor-queue') {
      // Editors viewing an edit request detail (/editing/:id) should see Edit Suite Assignments as active
      const isEditorOnly = user?.roles?.includes('Editor') && !user?.roles?.includes('Booking') && !user?.roles?.includes('Admin');
      if (pathParts[0] === 'editing' && pathParts[1] && isEditorOnly) {
        return 'editor-queue';
      }
      return pathParts[0];
    }
    return pathParts[0] || 'booking';
  };

  const currentSection = getCurrentSection();

  const getCurrentRole = (): UserRole => {
    const path = location.pathname.split('/')[1];
    switch (path) {
      case 'noc':
        return 'NOC';
      case 'ingest':
        return 'Ingest';
      case 'admin':
        return 'Admin';
      default:
        return 'Booking';
    }
  };

  const currentRole = getCurrentRole();

  const roleConfig = {
    Booking: { icon: User, label: 'Booking', path: '/booking' },
    NOC: { icon: Radio, label: 'NOC', path: '/noc' },
    Ingest: { icon: Package, label: 'Ingest', path: '/ingest' },
    Admin: { icon: Shield, label: 'Booking Dashboard', path: '/admin' },
    Callsheet: { icon: FileText, label: 'Call Sheet', path: '/callsheet' }
  };

  const hasCallsheetAccess = user?.roles?.includes('Callsheet') || user?.roles?.includes('Admin');
  const hasAdminAccess = user?.roles?.includes('Admin');
  const hasTechnicalStoreAccess = user?.roles?.includes('TechnicalStore') || user?.roles?.includes('Admin');
  const hasEditingAccess = user?.roles?.includes('Booking') || user?.roles?.includes('Admin');
  const hasEditorQueueAccess = user?.roles?.includes('Editor') || user?.roles?.includes('Admin');
  const hasRotaAccess = user?.roles?.includes('Admin') || user?.roles?.includes('RotaTeamLead');
  const hasEditSuiteDashboardAccess =
    user?.roles?.includes('Admin') ||
    user?.roles?.includes('Booking') ||
    user?.roles?.includes('Editor');

  const getAllowedRoles = (): UserRole[] => {
    if (!user || !user.roles || user.roles.length === 0) {
      return [];
    }

    const allowed: UserRole[] = [];

    if (user.roles.includes('Booking')) allowed.push('Booking');
    if (user.roles.includes('NOC')) allowed.push('NOC');
    if (user.roles.includes('Ingest')) allowed.push('Ingest');
    if (user.roles.includes('Admin')) allowed.push('Admin');
    if (user.roles.includes('Callsheet')) allowed.push('Callsheet');

    return allowed;
  };

  const roles: UserRole[] = getAllowedRoles();

  const getRoleDescription = (role: UserRole): string => {
    switch (role) {
      case 'Booking':
        return 'Create and manage workflow requests';
      case 'NOC':
        return 'Review requests and assign resources';
      case 'Ingest':
        return 'Process final stage workflow requests';
      case 'Admin':
        return 'Full system access and analytics';
      default:
        return '';
    }
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar-background border-r border-sidebar-border transform transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-auto ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-sidebar-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={theme === 'dark' ? qBusinessLogoDark : qBusinessLogoLight}
                  alt="QBusiness Logo"
                  className="h-12 object-contain"
                />
                {/* <div>
                  <h1 className="text-lg font-bold text-sidebar-foreground">Workflow Hub</h1>
                </div> */}
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
              const isActive = currentSection === role.toLowerCase() && location.pathname !== '/callsheet/analytics';

              return (
                <button
                  key={role}
                  onClick={() => navigate(roleConfig[role].path)}
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

            {hasCallsheetAccess && (
              <>
                {/* <div className="my-2 border-t border-sidebar-border"></div> */}
                <button
                  onClick={() => navigate('/callsheet/analytics')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    location.pathname === '/callsheet/analytics'
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  }`}
                >
                  <BarChart3 size={20} />
                  <span className="font-medium text-sm">Call Sheet Analytics</span>
                </button>
              </>
            )}

            {hasEditingAccess && (
              <>
                <button
                  onClick={() => navigate('/editing')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    currentSection === 'editing'
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  }`}
                >
                  <Film size={20} />
                  <span className="font-medium text-sm">Edit Suite Booking</span>
                </button>
              </>
            )}

            {hasEditSuiteDashboardAccess && (
              <>
                <button
                  onClick={() => navigate('/editing/dashboard')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    currentSection === 'editing-dashboard'
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  }`}
                >
                  <CalendarDays size={20} />
                  <span className="font-medium text-sm">Edit Suite Dashboard</span>
                </button>
              </>
            )}

            {hasRotaAccess && (
              <>
                <button
                  onClick={() => navigate('/rota')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    currentSection === 'rota'
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  }`}
                >
                  <CalendarDays size={20} />
                  <span className="font-medium text-sm">Rota Management</span>
                </button>
              </>
            )}

            {hasEditorQueueAccess && (
              <>
                <button
                  onClick={() => navigate('/editor-queue')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    currentSection === 'editor-queue'
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  }`}
                >
                  <Inbox size={20} />
                  <span className="font-medium text-sm">Edit Suite Assignments</span>
                </button>
              </>
            )}

            {hasTechnicalStoreAccess && (
              <>
                {/* <div className="my-2 border-t border-sidebar-border"></div> */}
                <button
                  onClick={() => navigate('/inventory')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    currentSection === 'inventory'
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  }`}
                >
                  <Boxes size={20} />
                  <span className="font-medium text-sm">Inventory</span>
                </button>
              </>
            )}

            {/* <button
              onClick={() => navigate('/studio-booking')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                currentSection === 'studio-booking'
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <Video size={20} />
              <span className="font-medium text-sm">Studio Booking</span>
            </button> */}

            {hasAdminAccess && (
              <>
                <div className="my-2 border-t border-sidebar-border"></div>
                <button
                  onClick={() => navigate('/admin/users')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    location.pathname === '/admin/users'
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  }`}
                >
                  <Users size={20} />
                  <span className="font-medium text-sm">User Management</span>
                </button>
              </>
            )}
            </div>
          </nav>

          <div className="p-4 border-t border-sidebar-border">
            {/* <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-sidebar-foreground hover:bg-sidebar-accent mb-3"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              <span className="font-medium text-sm">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
            </button> */}
            <p className="text-xs text-sidebar-foreground font-bold opacity-60">Resource Management Workflow</p>
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
                    {currentSection === 'callsheet'
                      ? 'Call Sheet Workflow'
                      : currentSection === 'inventory'
                      ? 'Inventory Management'
                      : currentSection === 'editing'
                      ? 'Edit Suite Booking'
                      : currentSection === 'editing-dashboard'
                      ? 'Edit Suite Dashboard'
                      : currentSection === 'editor-queue'
                      ? 'Edit Suite Assignments'
                      : currentSection === 'rota'
                      ? 'Rota Management'
                      : currentSection === 'studio-booking'
                      ? 'Studio Booking'
                      : currentSection === 'admin-users'
                      ? 'User Management'
                      : currentRole}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {currentSection === 'callsheet'
                      ? 'Manage call sheets, equipment, and transportation requests'
                      : currentSection === 'inventory'
                      ? 'Manage technical store inventory items'
                      : currentSection === 'editing'
                      ? 'Create and manage edit suite booking requests'
                      : currentSection === 'editing-dashboard'
                      ? 'Weekly schedule of edit room reservations'
                      : currentSection === 'editor-queue'
                      ? 'View and assign edit suite booking requests'
                      : currentSection === 'rota'
                      ? 'Manage department rotas and shift assignments'
                      : currentSection === 'studio-booking'
                      ? 'Manage studio bookings and schedules'
                      : currentSection === 'admin-users'
                      ? 'Manage system users, roles, and permissions'
                      : getRoleDescription(currentRole)
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <NotificationDropdown />
                <button
                  onClick={toggleTheme}
                  className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-card-foreground"
                >
                  {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>

                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <UserCircle size={20} className="text-muted-foreground" />
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-medium text-card-foreground">{user?.username}</p>
                      <p className="text-xs text-muted-foreground">{user?.roles?.join(', ')}</p>
                    </div>
                  </button>

                  {userMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setUserMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50">
                        <div className="p-3 border-b border-border">
                          <p className="text-sm font-medium text-card-foreground">{user?.username}</p>
                          <p className="text-xs text-muted-foreground">{user?.roles?.join(', ')}</p>
                        </div>
                        <button
                          onClick={() => {
                            setChangePasswordOpen(true);
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-card-foreground hover:bg-muted transition-colors"
                        >
                          <KeyRound size={16} />
                          Change Password
                        </button>
                        <NotificationSettings />
                        <button
                          onClick={() => {
                            logout();
                            navigate('/login');
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-border"
                        >
                          <LogOut size={16} />
                          Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <NotificationPermissionBanner />

      {user && (
        <ChangePasswordModal
          open={changePasswordOpen}
          onOpenChange={setChangePasswordOpen}
          userId={user.id}
          username={user.username}
        />
      )}
    </div>
  );
};
