import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import type { UserRole } from '../types/workflow';
import {
  User, Radio, Package, Shield, Menu, X, Sun, Moon, FileText,
  LogOut, UserCircle, BarChart3, Boxes, Tv, Users, KeyRound,
  Film, Inbox, CalendarDays, ChevronLeft, ChevronRight, Briefcase,
  LayoutDashboard, ClipboardList, FileBarChart, Search, CalendarCheck,
  Handshake, ChevronDown, UserCheck, UserRoundCog, FileSignature, ShieldCheck,
  Phone, Contact, CalendarRange, ScrollText, Clapperboard, MonitorPlay, CalendarClock,
} from 'lucide-react';
import { HrLanguageProvider, HrLanguageToggle } from '../../hr_workflow/context/HrLanguageContext';
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

// ── Sidebar building blocks ──────────────────────────────────────────
// Declared at module level (not inside BookingDashboard) so they keep their
// identity across renders — otherwise the expand/collapse transitions would
// remount and never animate.

const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches;

/** Animated show/hide wrapper for nested nav lists (grid-rows trick). */
function SidebarCollapse({ open, className, children }: {
  open: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-out',
        open ? 'grid-rows-[1fr] opacity-100 visible' : 'grid-rows-[0fr] opacity-0 invisible',
        className
      )}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

/** Small uppercase caption separating sidebar sections (a divider when collapsed). */
function SidebarSection({ label, collapsed, first }: { label: string; collapsed: boolean; first?: boolean }) {
  return (
    <div className={cn('px-3 pb-1.5', first ? 'pt-1' : 'pt-5', collapsed && 'lg:px-2 lg:pb-2 lg:pt-3')}>
      <p className={cn(
        'text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/45 select-none',
        collapsed && 'lg:hidden'
      )}>
        {label}
      </p>
      {collapsed && !first && <div className="hidden lg:block h-px bg-sidebar-border" />}
    </div>
  );
}

/** Top-level nav link. */
function SidebarItem({ icon: Icon, label, isActive, onClick, badge, collapsed }: {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: React.ReactNode;
  collapsed: boolean;
}) {
  return (
    <button
      type="button"
      title={collapsed ? label : undefined}
      aria-current={isActive ? 'page' : undefined}
      onClick={onClick}
      className={cn(
        'group relative w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-all duration-200',
        collapsed && 'lg:justify-center lg:px-0 lg:h-10',
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-md shadow-sidebar-primary/25 ring-1 ring-inset ring-white/10'
          : 'text-sidebar-foreground/80 font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-sm'
      )}
    >
      <span className="relative shrink-0">
        <Icon
          size={18}
          className={cn(
            'transition-colors',
            !isActive && 'text-sidebar-foreground/55 group-hover:text-sidebar-accent-foreground'
          )}
        />
        {badge && collapsed && (
          <span className="absolute -top-0.5 -right-0.5 hidden lg:block">
            <ScheduleNewBadge compact />
          </span>
        )}
      </span>
      <span className={cn('truncate flex-1 min-w-0', collapsed && 'lg:hidden')}>{label}</span>
      {badge && <span className={cn('shrink-0', collapsed && 'lg:hidden')}>{badge}</span>}
    </button>
  );
}

/** Indented link inside a group. */
function SidebarSubItem({ icon: Icon, label, isActive, onClick, small }: {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      aria-current={isActive ? 'page' : undefined}
      onClick={onClick}
      className={cn(
        'group relative w-full flex items-center gap-2.5 rounded-md text-left transition-all duration-200',
        small ? 'py-1.5 px-2.5 text-xs' : 'py-[7px] px-2.5 text-[13px]',
        isActive
          ? 'bg-sidebar-background text-sidebar-accent-foreground font-semibold shadow-sm ring-1 ring-sidebar-border'
          : 'text-sidebar-foreground/75 font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      )}
    >
      {/* Active marker sitting on the group's guide line */}
      <span
        aria-hidden
        className={cn(
          'absolute -left-[13px] top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-sidebar-primary transition-opacity duration-200',
          isActive ? 'opacity-100' : 'opacity-0'
        )}
      />
      <Icon
        size={small ? 14 : 16}
        className={cn(
          'shrink-0 transition-colors',
          isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground'
        )}
      />
      <span className="truncate">{label}</span>
    </button>
  );
}

/** Collapsible top-level group ("folder"). In the desktop icon-only sidebar it acts as a link instead. */
function SidebarGroup({ icon: Icon, label, isActive, open, collapsed, onToggle, onCollapsedClick, children }: {
  icon: React.ElementType;
  label: string;
  /** One of the group's pages is the current page. */
  isActive: boolean;
  open: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onCollapsedClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        title={collapsed ? label : undefined}
        aria-expanded={open}
        onClick={() => (collapsed && isDesktop() ? onCollapsedClick() : onToggle())}
        className={cn(
          'group w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-all duration-200',
          collapsed && 'lg:justify-center lg:px-0 lg:h-10',
          isActive
            ? cn(
                'text-sidebar-accent-foreground font-semibold hover:bg-sidebar-accent',
                collapsed && 'lg:bg-sidebar-primary lg:text-sidebar-primary-foreground lg:shadow-md lg:shadow-sidebar-primary/25'
              )
            : 'text-sidebar-foreground/80 font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-sm'
        )}
      >
        <Icon
          size={18}
          className={cn(
            'shrink-0 transition-colors',
            isActive
              ? cn('text-sidebar-accent-foreground', collapsed && 'lg:text-sidebar-primary-foreground')
              : 'text-sidebar-foreground/55 group-hover:text-sidebar-accent-foreground'
          )}
        />
        <span className={cn('truncate flex-1 min-w-0', collapsed && 'lg:hidden')}>{label}</span>
        <ChevronDown
          size={15}
          className={cn(
            'shrink-0 text-sidebar-foreground/45 transition-transform duration-300',
            open && 'rotate-180',
            collapsed && 'lg:hidden'
          )}
        />
      </button>

      <SidebarCollapse open={open} className={cn(collapsed && 'lg:hidden')}>
        <div className="mt-0.5 mb-1 ml-[21px] pl-3 border-l border-sidebar-border flex flex-col gap-0.5 py-0.5">
          {children}
        </div>
      </SidebarCollapse>
    </div>
  );
}

/** Nested collapsible group inside a group (used by HR System). */
function SidebarSubGroup({ icon: Icon, label, isActive, open, onToggle, children }: {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={cn(
          'group w-full flex items-center gap-2.5 rounded-md py-[7px] px-2.5 text-left text-[13px] transition-all duration-200',
          isActive
            ? 'text-sidebar-accent-foreground font-semibold hover:bg-sidebar-accent'
            : 'text-sidebar-foreground/75 font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        )}
      >
        <Icon
          size={16}
          className={cn(
            'shrink-0 transition-colors',
            isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground'
          )}
        />
        <span className="flex-1 truncate">{label}</span>
        <ChevronDown
          size={14}
          className={cn('shrink-0 text-sidebar-foreground/45 transition-transform duration-300', open && 'rotate-180')}
        />
      </button>
      <SidebarCollapse open={open}>
        <div className="mt-0.5 mb-1 ml-[17px] pl-3 border-l border-sidebar-border flex flex-col gap-0.5 py-0.5">
          {children}
        </div>
      </SidebarCollapse>
    </div>
  );
}

type SidebarLink = {
  key: string;
  icon: React.ElementType;
  label: string;
  path: string;
  visible: boolean;
  isActive: boolean;
};

type SidebarGroupConfig = {
  key: string;
  icon: React.ElementType;
  label: string;
  items: SidebarLink[];
};

export const BookingDashboard: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Mobile overlay open/close
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Desktop collapsed (icon-only) — perssisted
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [hrOpen, setHrOpen] = useState(() => location.pathname.startsWith('/hr'));
  const [hrReportsOpen, setHrReportsOpen] = useState(() => location.pathname.startsWith('/hr/reports'));
  const [hrEmployeesOpen, setHrEmployeesOpen] = useState(() => location.pathname.startsWith('/hr/employees'));
  const [hrFreelanceHiringOpen, setHrFreelanceHiringOpen] = useState(() =>
    location.pathname.startsWith('/hr/freelance-hiring') ||
    location.pathname === '/hr/department-approvals' ||
    location.pathname === '/hr/final-approvals'
  );
  // Explicit open/closed choices per sidebar group. A group the user hasn't
  // toggled yet follows the route: open when it contains the current page.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleCollapsed = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  };

  const getCurrentSection = (): string => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    if (pathParts[0] === 'admin' && pathParts[1] === 'users') return 'admin-users';
    if (pathParts[0] === 'dtl-booking') return 'dtl-booking';
    if (pathParts[0] === 'dtl-guest') return 'dtl-guest';
    if (pathParts[0] === 'dtl-dashboard') return 'dtl-dashboard';
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

  const hasCallsheetAccess = !!(user?.roles?.includes('Callsheet') || user?.roles?.includes('Admin'));
  const hasAdminAccess = user?.roles?.includes('Admin');
  const hasTechnicalStoreAccess = user?.roles?.includes('TechnicalStore') || user?.roles?.includes('Admin');
  const hasEditingAccess = user?.roles?.includes('Booking') || user?.roles?.includes('Admin');
  const hasEditorQueueAccess = user?.roles?.includes('Editor') || user?.roles?.includes('Admin');
  const hasRotaAccess = user?.roles?.includes('Admin') || user?.roles?.includes('RotaTeamLead');
  // Strict: only HRAdmin sees the HR module — Admin does not bypass this one.
  // DepartmentHead and FinalSignatory (GM) get in too, but only for their own
  // approvals queue below — not the coordinator tools (Dashboard, Employee
  // Records, etc).
  const isHRAdmin = user?.roles?.includes('HRAdmin') ?? false;
  const isDepartmentHead = user?.roles?.includes('DepartmentHead') ?? false;
  const isFinalSignatory = user?.roles?.includes('FinalSignatory') ?? false;
  const hasHRAccess = isHRAdmin || isDepartmentHead || isFinalSignatory;
  // Strict: only the BIT role sees the BIT checklists — Admin does not bypass this one.
  const hasBITAccess = user?.roles?.includes('BIT') ?? false;
  const hasEditSuiteDashboardAccess =
    user?.roles?.includes('Admin') ||
    user?.roles?.includes('Booking') ||
    user?.roles?.includes('Editor');
  const hasDtlAccess =
    user?.roles?.includes('Admin') ||
    user?.roles?.includes('CR') ||
    user?.roles?.includes('AssignmentTeam') ||
    user?.roles?.includes('AssignmentLead');
  const hasDtlDashboardAccess =
    user?.roles?.includes('Admin') || user?.roles?.includes('AssignmentLead');

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

  const goTo = (path: string) => { navigate(path); setSidebarOpen(false); };
  const isPath = (path: string, prefix = false) =>
    prefix ? location.pathname.startsWith(path) : location.pathname === path;
  const isCallsheetAnalytics = location.pathname === '/callsheet/analytics';

  // Grouped workflows. Each item keeps its own access check; a group shows
  // when the user can open at least one of its items.
  const navGroups: SidebarGroupConfig[] = [
    {
      key: 'bookings',
      icon: CalendarRange,
      label: 'Bookings',
      items: [
        { key: 'booking', icon: User, label: 'Booking', path: '/booking', visible: roles.includes('Booking'), isActive: currentSection === 'booking' },
        { key: 'admin', icon: Shield, label: 'Booking Dashboard', path: '/admin', visible: roles.includes('Admin'), isActive: currentSection === 'admin' },
        { key: 'noc', icon: Radio, label: 'NOC', path: '/noc', visible: roles.includes('NOC'), isActive: currentSection === 'noc' },
        { key: 'ingest', icon: Package, label: 'Ingest', path: '/ingest', visible: roles.includes('Ingest'), isActive: currentSection === 'ingest' },
      ],
    },
    {
      key: 'callsheets',
      icon: ScrollText,
      label: 'Call Sheets',
      items: [
        { key: 'callsheet', icon: FileText, label: 'Call Sheet', path: '/callsheet', visible: roles.includes('Callsheet'), isActive: currentSection === 'callsheet' && !isCallsheetAnalytics },
        { key: 'callsheet-analytics', icon: BarChart3, label: 'Analytics', path: '/callsheet/analytics', visible: hasCallsheetAccess, isActive: isCallsheetAnalytics },
      ],
    },
    {
      key: 'edit-suites',
      icon: Clapperboard,
      label: 'Edit Suites',
      items: [
        { key: 'editing', icon: Film, label: 'Booking', path: '/editing', visible: !!hasEditingAccess, isActive: currentSection === 'editing' },
        { key: 'editing-dashboard', icon: CalendarDays, label: 'Dashboard', path: '/editing/dashboard', visible: !!hasEditSuiteDashboardAccess, isActive: currentSection === 'editing-dashboard' },
        { key: 'editor-queue', icon: Inbox, label: 'Assignments', path: '/editor-queue', visible: !!hasEditorQueueAccess, isActive: currentSection === 'editor-queue' },
      ],
    },
    {
      key: 'dtl',
      icon: MonitorPlay,
      label: 'DTL',
      items: [
        { key: 'dtl-dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/dtl-dashboard', visible: !!(hasDtlAccess && hasDtlDashboardAccess), isActive: currentSection === 'dtl-dashboard' },
        { key: 'dtl-booking', icon: Phone, label: 'Booking', path: '/dtl-booking', visible: !!hasDtlAccess, isActive: currentSection === 'dtl-booking' },
        { key: 'dtl-guest', icon: Contact, label: 'Guest', path: '/dtl-guest', visible: !!hasDtlAccess, isActive: currentSection === 'dtl-guest' },
      ],
    },
  ]
    .map((group) => ({ ...group, items: group.items.filter((item) => item.visible) }))
    .filter((group) => group.items.length > 0);

  const isGroupOpen = (key: string, hasActive: boolean) => openGroups[key] ?? hasActive;
  const toggleGroup = (key: string, hasActive: boolean) =>
    setOpenGroups((prev) => ({ ...prev, [key]: !(prev[key] ?? hasActive) }));

  const hasScheduleAccess = !hasHRAccess;
  const hasStandaloneItems = hasRotaAccess || hasTechnicalStoreAccess || hasBITAccess || hasScheduleAccess;
  const hasWorkspaceItems = navGroups.length > 0 || hasHRAccess;

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
      case 'dtl-booking': return 'DTL Booking';
      case 'dtl-guest': return 'DTL Guest';
      case 'dtl-dashboard': return 'DTL Dashboard';
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
      case 'dtl-booking': return 'Create and manage down-the-line guest bookings';
      case 'dtl-guest': return 'Search, create, and edit DTL guest contacts';
      case 'dtl-dashboard': return 'Overview of DTL guests and bookings';
      default: return getRoleDescription(currentRole);
    }
  })();

  return (
    <HrLanguageProvider>
    <div className="h-screen bg-background flex overflow-hidden">

      {/* ── SIDEBAR ─────────────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 bg-sidebar-background border-r border-sidebar-border',
          'shadow-2xl lg:shadow-[4px_0_24px_-12px_rgba(15,23,42,0.12)]',
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
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3">
          {hasWorkspaceItems && (
            <>
              <SidebarSection label="Workflows" collapsed={sidebarCollapsed} first />
              <div className="space-y-0.5">
                {navGroups.map((group) => {
                  const hasActive = group.items.some((item) => item.isActive);
                  return (
                    <SidebarGroup
                      key={group.key}
                      icon={group.icon}
                      label={group.label}
                      isActive={hasActive}
                      open={isGroupOpen(group.key, hasActive)}
                      collapsed={sidebarCollapsed}
                      onToggle={() => toggleGroup(group.key, hasActive)}
                      onCollapsedClick={() => goTo(group.items[0].path)}
                    >
                      {group.items.map((item) => (
                        <SidebarSubItem
                          key={item.key}
                          icon={item.icon}
                          label={item.label}
                          isActive={item.isActive}
                          onClick={() => goTo(item.path)}
                        />
                      ))}
                    </SidebarGroup>
                  );
                })}

                {hasHRAccess && (
                  <SidebarGroup
                    icon={Briefcase}
                    label="HR System"
                    isActive={currentSection === 'hr'}
                    open={hrOpen}
                    collapsed={sidebarCollapsed}
                    onToggle={() => setHrOpen((v) => !v)}
                    onCollapsedClick={() => goTo('/hr/dashboard')}
                  >
                    {isHRAdmin && (
                      <SidebarSubItem icon={LayoutDashboard} label="Dashboard" isActive={isPath('/hr/dashboard')} onClick={() => goTo('/hr/dashboard')} />
                    )}

                    {isHRAdmin && (
                      <SidebarSubGroup
                        icon={Users}
                        label="Employee Records"
                        isActive={isPath('/hr/employees', true)}
                        open={hrEmployeesOpen}
                        onToggle={() => setHrEmployeesOpen((v) => !v)}
                      >
                        <SidebarSubItem icon={UserCheck} label="Permanent" small isActive={isPath('/hr/employees/permanent', true)} onClick={() => goTo('/hr/employees/permanent')} />
                        <SidebarSubItem icon={UserRoundCog} label="Freelance" small isActive={isPath('/hr/employees/freelance', true)} onClick={() => goTo('/hr/employees/freelance')} />
                      </SidebarSubGroup>
                    )}

                    {/* Visible to HRAdmin (Contract Renewal) as well as Department
                        Head / GM (their own approval queue only) — unlike the
                        other HR-System sections, this one isn't HRAdmin-only. */}
                    {(isHRAdmin || isDepartmentHead || isFinalSignatory) && (
                      <SidebarSubGroup
                        icon={Handshake}
                        label="Freelance Hiring"
                        isActive={
                          isPath('/hr/freelance-hiring', true) ||
                          isPath('/hr/department-approvals') ||
                          isPath('/hr/final-approvals')
                        }
                        open={hrFreelanceHiringOpen}
                        onToggle={() => setHrFreelanceHiringOpen((v) => !v)}
                      >
                        {isHRAdmin && (
                          <SidebarSubItem icon={FileSignature} label="Contract Renewal" small isActive={isPath('/hr/freelance-hiring/contract-renewal')} onClick={() => goTo('/hr/freelance-hiring/contract-renewal')} />
                        )}
                        {isHRAdmin && (
                          <SidebarSubItem icon={UserCheck} label="Profile Submissions" small isActive={isPath('/hr/freelance-hiring/profile-submissions')} onClick={() => goTo('/hr/freelance-hiring/profile-submissions')} />
                        )}
                        {(isHRAdmin || isDepartmentHead || isFinalSignatory) && (
                          <SidebarSubItem icon={UserRoundCog} label="New Freelancer Hiring" small isActive={isPath('/hr/freelance-hiring/hiring-requests')} onClick={() => goTo('/hr/freelance-hiring/hiring-requests')} />
                        )}
                        {isDepartmentHead && (
                          <SidebarSubItem icon={FileSignature} label="Manager Approval" small isActive={isPath('/hr/department-approvals')} onClick={() => goTo('/hr/department-approvals')} />
                        )}
                        {isFinalSignatory && (
                          <SidebarSubItem icon={ShieldCheck} label="Final Approvals" small isActive={isPath('/hr/final-approvals')} onClick={() => goTo('/hr/final-approvals')} />
                        )}
                      </SidebarSubGroup>
                    )}

                    {isHRAdmin && (
                      <SidebarSubGroup
                        icon={ClipboardList}
                        label="Reports"
                        isActive={isPath('/hr/reports', true)}
                        open={hrReportsOpen}
                        onToggle={() => setHrReportsOpen((v) => !v)}
                      >
                        <SidebarSubItem icon={FileBarChart} label="Financial reports" small isActive={isPath('/hr/reports/financial')} onClick={() => goTo('/hr/reports/financial')} />
                        <SidebarSubItem icon={Search} label="Hiring Reports" small isActive={isPath('/hr/reports/hiring')} onClick={() => goTo('/hr/reports/hiring')} />
                      </SidebarSubGroup>
                    )}

                    {isHRAdmin && (
                      <SidebarSubItem icon={CalendarCheck} label="Leave Request" isActive={isPath('/hr/leave-requests')} onClick={() => goTo('/hr/leave-requests')} />
                    )}
                  </SidebarGroup>
                )}
              </div>
            </>
          )}

          {hasStandaloneItems && (
            <>
              <SidebarSection label="Planning & Resources" collapsed={sidebarCollapsed} first={!hasWorkspaceItems} />
              <div className="space-y-0.5">
                {hasRotaAccess && (
                  <SidebarItem
                    icon={CalendarClock}
                    label="Rota Management"
                    isActive={currentSection === 'rota'}
                    onClick={() => goTo('/rota')}
                    collapsed={sidebarCollapsed}
                  />
                )}
                {hasTechnicalStoreAccess && (
                  <SidebarItem
                    icon={Boxes}
                    label="Inventory"
                    isActive={currentSection === 'inventory'}
                    onClick={() => goTo('/inventory')}
                    collapsed={sidebarCollapsed}
                  />
                )}
                {hasBITAccess && (
                  <SidebarItem
                    icon={ClipboardList}
                    label="BIT Checklists"
                    isActive={currentSection === 'bit'}
                    onClick={() => goTo('/bit')}
                    collapsed={sidebarCollapsed}
                  />
                )}
                {hasScheduleAccess && (
                  <SidebarItem
                    icon={Tv}
                    label="Programme Schedule"
                    isActive={currentSection === 'schedule'}
                    onClick={() => goTo('/schedule')}
                    badge={<ScheduleNewBadge />}
                    collapsed={sidebarCollapsed}
                  />
                )}
              </div>
            </>
          )}

          {hasAdminAccess && (
            <>
              <SidebarSection label="Administration" collapsed={sidebarCollapsed} />
              <SidebarItem
                icon={Users}
                label="User Management"
                isActive={isPath('/admin/users')}
                onClick={() => goTo('/admin/users')}
                collapsed={sidebarCollapsed}
              />
            </>
          )}
        </nav>

        {/* ── Footer with collapse toggle ── */}
        <div className="shrink-0 border-t border-sidebar-border p-3 space-y-2">
          {/* Desktop collapse toggle button */}
          <button
            type="button"
            onClick={toggleCollapsed}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'group hidden lg:flex items-center w-full rounded-lg px-3 py-2 text-sidebar-foreground/70',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-sm transition-all duration-200',
              sidebarCollapsed ? 'lg:justify-center lg:px-0 lg:h-10' : 'gap-3'
            )}
          >
            {sidebarCollapsed
              ? <ChevronRight size={18} className="shrink-0" />
              : (
                <>
                  <ChevronLeft size={18} className="shrink-0 transition-transform group-hover:-translate-x-0.5" />
                  <span className="text-xs font-medium">Collapse sidebar</span>
                </>
              )
            }
          </button>

          {/* Footer text (hidden when collapsed) */}
          <div className={cn(
            'rounded-lg border border-sidebar-border bg-sidebar-accent/50 px-3 py-2.5',
            sidebarCollapsed && 'lg:hidden'
          )}>
            <p className="text-[11px] font-semibold text-sidebar-foreground/70 tracking-wide">
              Resource Management Workflow
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
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
                {currentSection === 'hr' && <HrLanguageToggle />}
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
    </HrLanguageProvider>
  );
};
