import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import type { UserRole } from '../types/workflow';
import {
  User, Radio, Package, Shield, Menu, X, Sun, Moon, FileText,
  LogOut, UserCircle, BarChart3, Boxes, Tv, Users, KeyRound,
  Film, Inbox, CalendarDays, ChevronLeft, ChevronRight, Briefcase,
  LayoutDashboard, ClipboardList, FileBarChart, Search, CalendarCheck,
  Handshake, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationDropdown } from '../../components/NotificationDropdown';
import { NotificationPermissionBanner } from '../../components/NotificationPermissionBanner';
import { NotificationSettings } from '../../components/NotificationSettings';
import qbcDark from '../../assets/QBC-dark.png';
import qbcDarkAr from '../../assets/QBC-dark-ar.png';
import qbcLight from '../../assets/QBC-light.png';
import qbcLightAr from '../../assets/QBC-light-ar.png';
import { ChangePasswordModal } from './ChangePasswordModal';

function ScheduleNewBadge({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span
        className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-sidebar-background animate-nav-new-dot"
        aria-label="New module"
      />
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white animate-nav-new-glow">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-white/70 animate-ping" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
      </span>
      New
    </span>
  );
}

export const BookingDashboard: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Mobile overlay open/close
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Desktop collapsed (icon-only) — persisted
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [hrOpen, setHrOpen] = useState(() => location.pathname.startsWith('/hr'));
  const [hrReportsOpen, setHrReportsOpen] = useState(() => location.pathname.startsWith('/hr/reports'));

  const toggleCollapsed = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  };

  const getCurrentSection = (): string => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    if (pathParts[0] === 'admin' && pathParts[1] === 'users') return 'admin-users';
    if (pathParts[0] === 'rota') return 'rota';
    if (pathParts[0] === 'schedule') return 'schedule';
    if (pathParts[0] === 'hr') return 'hr';
    if (pathParts[0] === 'bit') return 'bit';
    if (pathParts[0] === 'studio-booking') return 'studio-booking';
    if (pathParts[0] === 'editing' && pathParts[1] === 'dashboard') return 'editing-dashboard';
    if (pathParts[0] === 'editing' || pathParts[0] === 'editor-queue') {
      const isEditorOnly =
        user?.roles?.includes('Editor') &&
        !user?.roles?.includes('Booking') &&
        !user?.roles?.includes('Admin');
      if (pathParts[0] === 'editing' && pathParts[1] && isEditorOnly) return 'editor-queue';
      return pathParts[0];
    }
    return pathParts[0] || 'booking';
  };

  const currentSection = getCurrentSection();

  const getCurrentRole = (): UserRole => {
    const path = location.pathname.split('/')[1];
    switch (path) {
      case 'noc': return 'NOC';
      case 'ingest': return 'Ingest';
      case 'admin': return 'Admin';
      default: return 'Booking';
    }
  };

  const currentRole = getCurrentRole();

  const roleConfig = {
    Booking: { icon: User, label: 'Booking', path: '/booking' },
    NOC: { icon: Radio, label: 'NOC', path: '/noc' },
    Ingest: { icon: Package, label: 'Ingest', path: '/ingest' },
    Admin: { icon: Shield, label: 'Booking Dashboard', path: '/admin' },
    Callsheet: { icon: FileText, label: 'Call Sheet', path: '/callsheet' },
  };

  const hasCallsheetAccess = user?.roles?.includes('Callsheet') || user?.roles?.includes('Admin');
  const hasAdminAccess = user?.roles?.includes('Admin');
  const hasTechnicalStoreAccess = user?.roles?.includes('TechnicalStore') || user?.roles?.includes('Admin');
  const hasEditingAccess = user?.roles?.includes('Booking') || user?.roles?.includes('Admin');
  const hasEditorQueueAccess = user?.roles?.includes('Editor') || user?.roles?.includes('Admin');
  const hasRotaAccess = user?.roles?.includes('Admin') || user?.roles?.includes('RotaTeamLead');
  // Strict: only HRAdmin sees the HR module — Admin does not bypass this one.
  const hasHRAccess = user?.roles?.includes('HRAdmin') ?? false;
  // Strict: only the BIT role sees the BIT checklists — Admin does not bypass this one.
  const hasBITAccess = user?.roles?.includes('BIT') ?? false;
  const hasEditSuiteDashboardAccess =
    user?.roles?.includes('Admin') ||
    user?.roles?.includes('Booking') ||
    user?.roles?.includes('Editor');

  const getAllowedRoles = (): UserRole[] => {
    if (!user?.roles?.length) return [];
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
      case 'Booking': return 'Create and manage workflow requests';
      case 'NOC': return 'Review requests and assign resources';
      case 'Ingest': return 'Process final stage workflow requests';
      case 'Admin': return 'Full system access and analytics';
      default: return '';
    }
  };

  // Reusable nav button
  const NavBtn = ({
    icon: Icon,
    label,
    isActive,
    onClick,
    badge,
  }: {
    icon: React.ElementType;
    label: string;
    isActive: boolean;
    onClick: () => void;
    badge?: React.ReactNode;
  }) => (
    <button
      title={sidebarCollapsed ? label : undefined}
      onClick={() => { onClick(); setSidebarOpen(false); }}
      className={cn(
        'w-full flex items-center rounded-lg text-left transition-colors py-2.5',
        sidebarCollapsed ? 'lg:justify-center lg:px-2 gap-3 px-3' : 'gap-3 px-3',
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent'
      )}
    >
      <span className="relative shrink-0">
        <Icon size={20} />
        {badge && sidebarCollapsed && (
          <span className="absolute -top-0.5 -right-0.5 hidden lg:block">
            <ScheduleNewBadge compact />
          </span>
        )}
      </span>
      <span className={cn('font-medium text-sm truncate flex-1 min-w-0', sidebarCollapsed && 'lg:hidden')}>
        {label}
      </span>
      {badge && (
        <span className={cn('shrink-0', sidebarCollapsed && 'lg:hidden')}>
          {badge}
        </span>
      )}
    </button>
  );

  // HR System sub-nav link (indented item inside the expandable HR System group)
  const HrSubNavBtn = ({
    icon: Icon,
    label,
    path,
    small,
  }: {
    icon: React.ElementType;
    label: string;
    path: string;
    small?: boolean;
  }) => {
    const active = location.pathname === path;
    return (
      <button
        onClick={() => { navigate(path); setSidebarOpen(false); }}
        className={cn(
          'w-full flex items-center gap-2.5 rounded-md text-left transition-colors',
          small ? 'py-1.5 px-2.5 text-xs' : 'py-2 px-2.5 text-sm',
          active
            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
            : 'text-sidebar-foreground/90 hover:bg-sidebar-accent'
        )}
      >
        <Icon size={small ? 14 : 16} className="shrink-0" />
        <span className="truncate">{label}</span>
      </button>
    );
  };

  const headerTitle = (() => {
    switch (currentSection) {
      case 'callsheet': return 'Call Sheet Workflow';
      case 'inventory': return 'Inventory Management';
      case 'editing': return 'Edit Suite Booking';
      case 'editing-dashboard': return 'Edit Suite Dashboard';
      case 'editor-queue': return 'Edit Suite Assignments';
      case 'rota': return 'Rota Management';
      case 'studio-booking': return 'Studio Booking';
      case 'schedule': return 'Programme Schedule';
      case 'admin-users': return 'User Management';
      case 'hr': return 'HR System';
      case 'bit': return 'BIT Checklists';
      default: return currentRole;
    }
  })();

  const headerSubtitle = (() => {
    switch (currentSection) {
      case 'callsheet': return 'Manage call sheets, equipment, and transportation requests';
      case 'inventory': return 'Manage technical store inventory items';
      case 'editing': return 'Create and manage edit suite booking requests';
      case 'editing-dashboard': return 'Weekly schedule of edit room reservations';
      case 'editor-queue': return 'View and assign edit suite booking requests';
      case 'rota': return 'Manage department rotas and shift assignments';
      case 'studio-booking': return 'Manage studio bookings and schedules';
      case 'schedule': return 'QBC channel programme guide from BCM';
      case 'admin-users': return 'Manage system users, roles, and permissions';
      case 'hr': return 'Employee records, leave, hiring requests, and workforce reports';
      case 'bit': return 'Daily, weekly and monthly system readiness checklists';
      default: return getRoleDescription(currentRole);
    }
  })();

  return (
    <div className="h-screen bg-background flex overflow-hidden">

      {/* ── SIDEBAR ─────────────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 bg-sidebar-background border-r border-sidebar-border',
          'transform transition-all duration-300 ease-in-out',
          'flex flex-col',
          // Mobile: always w-64, slides in/out
          // Desktop: w-64 expanded or w-16 collapsed
          sidebarCollapsed ? 'w-64 lg:w-16' : 'w-64',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          'lg:static lg:inset-auto'
        )}
      >
        {/* ── Logo header ── */}
        <div className="shrink-0 border-b border-sidebar-border">
          <div className={cn(
            'flex items-center justify-between transition-all duration-300',
            sidebarCollapsed ? 'p-3 lg:justify-center' : 'p-4'
          )}>

            {/* Full dual-logo (shown when expanded OR on mobile) */}
            <div className={cn(
              'flex items-center gap-2',
              sidebarCollapsed && 'lg:hidden'
            )}>
              <div className="h-10 w-[92px] shrink-0 flex items-center justify-center">
                <img
                  src={theme === 'dark' ? qbcDark : qbcLight}
                  alt="QBC"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="w-px h-8 bg-sidebar-border opacity-60 shrink-0" />
              <div className="h-10 w-[88px] shrink-0 flex items-center justify-center">
                <img
                  src={theme === 'dark' ? qbcDarkAr : qbcLightAr}
                  alt="كيو بي سي"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>

            {/* Small icon logo (desktop collapsed only) */}
            <div className={cn(
              'hidden',
              sidebarCollapsed && 'lg:flex items-center justify-center'
            )}>
              <div className="h-8 w-8 flex items-center justify-center">
                <img
                  src={theme === 'dark' ? qbcDark : qbcLight}
                  alt="QBC"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-sidebar-foreground hover:text-sidebar-primary p-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Nav items ── */}
        <nav className="flex-1 overflow-y-auto p-2">
          <div className="space-y-0.5">

            {roles.map(role => {
              const isActive =
                currentSection === role.toLowerCase() &&
                location.pathname !== '/callsheet/analytics';
              return (
                <NavBtn
                  key={role}
                  icon={roleConfig[role].icon}
                  label={roleConfig[role].label}
                  isActive={isActive}
                  onClick={() => navigate(roleConfig[role].path)}
                />
              );
            })}

            {hasCallsheetAccess && (
              <NavBtn
                icon={BarChart3}
                label="Call Sheet Analytics"
                isActive={location.pathname === '/callsheet/analytics'}
                onClick={() => navigate('/callsheet/analytics')}
              />
            )}

            {hasEditingAccess && (
              <NavBtn
                icon={Film}
                label="Edit Suite Booking"
                isActive={currentSection === 'editing'}
                onClick={() => navigate('/editing')}
              />
            )}

            {hasEditSuiteDashboardAccess && (
              <NavBtn
                icon={CalendarDays}
                label="Edit Suite Dashboard"
                isActive={currentSection === 'editing-dashboard'}
                onClick={() => navigate('/editing/dashboard')}
              />
            )}

            {hasRotaAccess && (
              <NavBtn
                icon={CalendarDays}
                label="Rota Management"
                isActive={currentSection === 'rota'}
                onClick={() => navigate('/rota')}
              />
            )}

            {hasEditorQueueAccess && (
              <NavBtn
                icon={Inbox}
                label="Edit Suite Assignments"
                isActive={currentSection === 'editor-queue'}
                onClick={() => navigate('/editor-queue')}
              />
            )}

            {hasTechnicalStoreAccess && (
              <NavBtn
                icon={Boxes}
                label="Inventory"
                isActive={currentSection === 'inventory'}
                onClick={() => navigate('/inventory')}
              />
            )}

            {hasBITAccess && (
              <NavBtn
                icon={ClipboardList}
                label="BIT Checklists"
                isActive={currentSection === 'bit'}
                onClick={() => navigate('/bit')}
              />
            )}

            {!hasHRAccess && (
              <NavBtn
                icon={Tv}
                label="Programme Schedule"
                isActive={currentSection === 'schedule'}
                onClick={() => navigate('/schedule')}
                badge={<ScheduleNewBadge />}
              />
            )}

            {hasHRAccess && (
            <div>
              <button
                title={sidebarCollapsed ? 'HR System' : undefined}
                onClick={() => {
                  if (sidebarCollapsed) {
                    navigate('/hr/dashboard');
                    setSidebarOpen(false);
                    return;
                  }
                  setHrOpen((v) => !v);
                }}
                className={cn(
                  'w-full flex items-center rounded-lg text-left transition-colors py-2.5',
                  sidebarCollapsed ? 'lg:justify-center lg:px-2 gap-3 px-3' : 'gap-3 px-3',
                  currentSection === 'hr'
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <Briefcase size={20} className="shrink-0" />
                <span className={cn('font-medium text-sm truncate flex-1 min-w-0', sidebarCollapsed && 'lg:hidden')}>
                  HR System
                </span>
                <ChevronDown
                  size={16}
                  className={cn('shrink-0 transition-transform', sidebarCollapsed && 'lg:hidden', hrOpen && 'rotate-180')}
                />
              </button>

              {hrOpen && (
                <div className={cn('mt-0.5 flex flex-col gap-0.5 pl-4 ml-4 border-l border-sidebar-border', sidebarCollapsed && 'lg:hidden')}>
                  <HrSubNavBtn icon={LayoutDashboard} label="Dashboard" path="/hr/dashboard" />
                  <HrSubNavBtn icon={Users} label="Employee Records" path="/hr/employees" />

                  <div>
                    <button
                      onClick={() => setHrReportsOpen((v) => !v)}
                      className={cn(
                        'w-full flex items-center gap-2.5 rounded-md text-left transition-colors py-2 px-2.5 text-sm',
                        location.pathname.startsWith('/hr/reports')
                          ? 'text-primary font-medium'
                          : 'text-sidebar-foreground/90 hover:bg-sidebar-accent'
                      )}
                    >
                      <ClipboardList size={16} className="shrink-0" />
                      <span className="flex-1 truncate">Reports</span>
                      <ChevronDown
                        size={14}
                        className={cn('shrink-0 transition-transform', hrReportsOpen && 'rotate-180')}
                      />
                    </button>
                    {hrReportsOpen && (
                      <div className="mt-0.5 flex flex-col gap-0.5 pl-4 ml-4 border-l border-sidebar-border">
                        <HrSubNavBtn icon={FileBarChart} label="Financial reports" path="/hr/reports/financial" small />
                        <HrSubNavBtn icon={Search} label="Hiring Reports" path="/hr/reports/hiring" small />
                      </div>
                    )}
                  </div>

                  <HrSubNavBtn icon={CalendarCheck} label="Leave Request" path="/hr/leave-requests" />
                  <HrSubNavBtn icon={Handshake} label="Hiring Request" path="/hr/hiring-requests" />
                </div>
              )}
            </div>
            )}

            {hasAdminAccess && (
              <>
                <div className="my-1 border-t border-sidebar-border" />
                <NavBtn
                  icon={Users}
                  label="User Management"
                  isActive={location.pathname === '/admin/users'}
                  onClick={() => navigate('/admin/users')}
                />
              </>
            )}
          </div>
        </nav>

        {/* ── Footer with collapse toggle ── */}
        <div className="shrink-0 border-t border-sidebar-border">
          {/* Desktop collapse toggle button */}
          <button
            onClick={toggleCollapsed}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'hidden lg:flex items-center w-full px-3 py-3 text-sidebar-foreground hover:bg-sidebar-accent transition-colors',
              sidebarCollapsed ? 'lg:justify-center' : 'gap-3'
            )}
          >
            {sidebarCollapsed
              ? <ChevronRight size={18} className="shrink-0" />
              : (
                <>
                  <ChevronLeft size={18} className="shrink-0" />
                  <span className="text-xs font-medium">Collapse sidebar</span>
                </>
              )
            }
          </button>

          {/* Footer text (hidden when collapsed) */}
          <div className={cn(
            'px-4 pb-4 pt-1',
            sidebarCollapsed && 'lg:hidden'
          )}>
            <p className="text-xs text-sidebar-foreground font-bold opacity-60">
              Resource Management Workflow
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        <header className="bg-card border-b border-border sticky top-0 z-30">
          <div className="px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Mobile hamburger */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden text-card-foreground hover:text-primary"
                >
                  <Menu size={24} />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-card-foreground">{headerTitle}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{headerSubtitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
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
                    className="flex items-center gap-2 px-2 sm:px-3 py-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <UserCircle size={20} className="text-muted-foreground" />
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-medium text-card-foreground">{user?.username}</p>
                      <p className="text-xs text-muted-foreground">{user?.roles?.join(', ')}</p>
                    </div>
                  </button>

                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50">
                        <div className="p-3 border-b border-border">
                          <p className="text-sm font-medium text-card-foreground">{user?.username}</p>
                          <p className="text-xs text-muted-foreground">{user?.roles?.join(', ')}</p>
                        </div>
                        <button
                          onClick={() => { setChangePasswordOpen(true); setUserMenuOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-card-foreground hover:bg-muted transition-colors"
                        >
                          <KeyRound size={16} />
                          Change Password
                        </button>
                        <NotificationSettings />
                        <button
                          onClick={() => { logout(); navigate('/login'); setUserMenuOpen(false); }}
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
