import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Unauthorized } from './components/Unauthorized';
import { ProtectedRoute } from './components/ProtectedRoute';
import { BookingDashboard } from './booking_workflow/components/BookingDashboard';
import { RoleView } from './booking_workflow/components/RoleView';
import { RequestDetail } from './booking_workflow/components/RequestDetail';
import { CallSheetRoleView } from './callsheet_workflow/components/CallSheetRoleView';
import { CallSheetDetail } from './callsheet_workflow/components/CallSheetDetail';
import { EditingRequestsPage } from './editing_reservation/pages/EditingRequestsPage';
import { EditingDashboardPage } from './editing_reservation/pages/EditingDashboardPage';
import { NewEditingRequestPage } from './editing_reservation/pages/NewEditingRequestPage';
import { EditEditingRequestPage } from './editing_reservation/pages/EditEditingRequestPage';
import { EditingRequestDetailPage } from './editing_reservation/pages/EditingRequestDetailPage';
import { EditorQueuePage } from './editing_reservation/pages/EditorQueuePage';
import { CallSheetAnalytics } from './callsheet_workflow/components/CallSheetAnalytics';
import { InventoryList } from './inventory/components/InventoryList';
import { StudioBookingDashboard } from './studio_booking/components/StudioBookingDashboard';
import { UsersPage } from './admin/components/UsersPage';
import { RotaManagementPage } from './rota/pages/RotaManagementPage';
import { PublicRotaPage } from './rota/pages/PublicRotaPage';
import { RotaDepartmentSettingsPage } from './rota/pages/RotaDepartmentSettingsPage';
import { EPGViewer } from './epg_workflow/components/EPGViewer';
import { HRLayout } from './hr_workflow/components/HRLayout';
import { HRDashboardPage } from './hr_workflow/pages/HRDashboardPage';
import { EmployeeRecordsPage } from './hr_workflow/pages/EmployeeRecordsPage';
import { EmployeeDetailPage } from './hr_workflow/pages/EmployeeDetailPage';
import { EmployeeFormPage } from './hr_workflow/pages/EmployeeFormPage';
import { LeaveRequestPage } from './hr_workflow/pages/LeaveRequestPage';
import { HiringRequestPage } from './hr_workflow/pages/HiringRequestPage';
import { FinancialReportsPage } from './hr_workflow/pages/FinancialReportsPage';
import { HiringReportsPage } from './hr_workflow/pages/HiringReportsPage';
import { BITChecklistDashboardPage } from './bit_workflow/pages/BITChecklistDashboardPage';
import { BITChecklistListPage } from './bit_workflow/pages/BITChecklistListPage';
import { BITChecklistFormPage } from './bit_workflow/pages/BITChecklistFormPage';

function App() {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Default landing page after login — role-specific routes, or Programme Schedule for everyone else
  const getDefaultRoute = () => {
    if (!user) return "/login";

    const roles = user.roles ?? [];

    if (roles.includes("Admin")) return "/admin";
    if (roles.includes("NOC")) return "/noc";
    if (roles.includes("Ingest")) return "/ingest";
    if (roles.includes("Booking")) return "/booking";
    if (roles.includes("TechnicalStore")) return "/inventory";
    if (roles.includes("Callsheet")) return "/callsheet";
    if (roles.includes("Editor")) return "/editor-queue";
    if (roles.includes("RotaTeamLead")) return "/rota";
    if (roles.includes("HRAdmin")) return "/hr/dashboard";
    if (roles.includes("BIT")) return "/bit";

    // No workflow role — still allowed to view the programme schedule
    return "/schedule";
  };

  // 🔄 While auth is restoring
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>

      {/** 🔥 LOGIN FIX — Uses dynamic redirect */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={getDefaultRoute()} replace />
          ) : (
            <Login />
          )
        }
      />

      <Route path="/unauthorized" element={<Unauthorized />} />

      {/** ROTA PUBLIC (no auth) */}
      <Route path="/rota/public/:uuid" element={<PublicRotaPage />} />

      {/** MAIN WRAPPER */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <BookingDashboard />
          </ProtectedRoute>
        }
      >

        {/** 🔥 DEFAULT HOME REDIRECT FIX */}
        <Route
          index
          element={<Navigate to={getDefaultRoute()} replace />}
        />

        {/** BOOKING */}
        <Route
          path="booking"
          element={
            <ProtectedRoute allowedRoles={['Booking', 'Admin']}>
              <RoleView role="Booking" />
            </ProtectedRoute>
          }
        />
        <Route
          path="booking/new"
          element={
            <ProtectedRoute allowedRoles={['Booking', 'Admin']}>
              <RoleView role="Booking" />
            </ProtectedRoute>
          }
        />
        <Route
          path="booking/edit/:id"
          element={
            <ProtectedRoute allowedRoles={['Booking', 'Admin']}>
              <RoleView role="Booking" />
            </ProtectedRoute>
          }
        />
        <Route
          path="booking/requests/:id"
          element={
            <ProtectedRoute allowedRoles={['Booking', 'Admin']}>
              <RequestDetail />
            </ProtectedRoute>
          }
        />

        {/** NOC */}
        <Route
          path="noc"
          element={
            <ProtectedRoute allowedRoles={['NOC', 'Admin']}>
              <RoleView role="NOC" />
            </ProtectedRoute>
          }
        />
        <Route
          path="noc/requests/:id"
          element={
            <ProtectedRoute allowedRoles={['NOC', 'Admin']}>
              <RequestDetail />
            </ProtectedRoute>
          }
        />

        {/** INGEST */}
        <Route
          path="ingest"
          element={
            <ProtectedRoute allowedRoles={['Ingest', 'Admin']}>
              <RoleView role="Ingest" />
            </ProtectedRoute>
          }
        />
        <Route
          path="ingest/requests/:id"
          element={
            <ProtectedRoute allowedRoles={['Ingest', 'Admin']}>
              <RequestDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="ingest/new"
          element={
            <ProtectedRoute allowedRoles={['Ingest', 'Admin']}>
              <RoleView role="Ingest" />
            </ProtectedRoute>
          }
        />

        {/** ADMIN */}
        <Route
          path="admin"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <RoleView role="Admin" />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />

        {/** CALLSHEET */}
        <Route
          path="callsheet"
          element={
            <ProtectedRoute allowedRoles={['Callsheet', 'Admin', 'TechnicalStore']}>
              <CallSheetRoleView view="list" />
            </ProtectedRoute>
          }
        />
        <Route
          path="callsheet/new"
          element={
            <ProtectedRoute allowedRoles={['Callsheet', 'Admin']}>
              <CallSheetRoleView view="new" />
            </ProtectedRoute>
          }
        />
        <Route
          path="callsheet/analytics"
          element={
            <ProtectedRoute allowedRoles={['Callsheet', 'Admin']}>
              <CallSheetAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="callsheet/edit/:id"
          element={
            <ProtectedRoute allowedRoles={['Callsheet', 'Admin']}>
              <CallSheetRoleView view="edit" />
            </ProtectedRoute>
          }
        />
        <Route
          path="callsheet/:id"
          element={
            <ProtectedRoute>
              <CallSheetDetail />
            </ProtectedRoute>
          }
        />

        {/** EDIT RESERVATIONS (Producer/Booking) */}
        <Route
          path="editing"
          element={
            <ProtectedRoute allowedRoles={['Booking', 'Admin', 'SuperEditor']}>
              <EditingRequestsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="editing/dashboard"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Booking', 'Editor', 'SuperEditor']}>
              <EditingDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="editing/new"
          element={
            <ProtectedRoute allowedRoles={['Booking', 'Admin']}>
              <NewEditingRequestPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="editing/:id"
          element={
            <ProtectedRoute allowedRoles={['Booking', 'Admin', 'Editor', 'SuperEditor']}>
              <EditingRequestDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="editing/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['Booking', 'Admin']}>
              <EditEditingRequestPage />
            </ProtectedRoute>
          }
        />

        {/** EDIT SUITE ASSIGNMENTS */}
        <Route
          path="editor-queue"
          element={
            <ProtectedRoute allowedRoles={['Editor', 'Admin']}>
              <EditorQueuePage />
            </ProtectedRoute>
          }
        />

        {/** INVENTORY */}
        <Route
          path="inventory"
          element={
            <ProtectedRoute allowedRoles={['TechnicalStore', 'Admin']}>
              <InventoryList />
            </ProtectedRoute>
          }
        />

        {/** STUDIO BOOKING */}
        {/* <Route
          path="studio-booking"
          element={
            <ProtectedRoute>
              <StudioBookingDashboard />
            </ProtectedRoute>
          }
        /> */}

        {/** ROTA MANAGEMENT */}
        <Route
          path="rota"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'RotaTeamLead']}>
              <RotaManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="rota/departments/:id/settings"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'RotaTeamLead']}>
              <RotaDepartmentSettingsPage />
            </ProtectedRoute>
          }
        />

        {/** BIT CHECKLISTS — restricted to BIT only (strict: Admin does NOT bypass this) */}
        <Route
          path="bit"
          element={
            <ProtectedRoute allowedRoles={['BIT']} strict>
              <BITChecklistDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="bit/checklist/:type"
          element={
            <ProtectedRoute allowedRoles={['BIT']} strict>
              <BITChecklistListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="bit/checklist/:type/form"
          element={
            <ProtectedRoute allowedRoles={['BIT']} strict>
              <BITChecklistFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="bit/checklist/:type/view/:id"
          element={
            <ProtectedRoute allowedRoles={['BIT']} strict>
              <BITChecklistFormPage readOnly />
            </ProtectedRoute>
          }
        />

        {/** PROGRAMME SCHEDULE (EPG) — any authenticated user, no role required */}
        <Route path="schedule" element={<EPGViewer />} />

        {/** HR SYSTEM — restricted to HRAdmin only (strict: Admin does NOT bypass this) */}
        <Route
          path="hr"
          element={
            <ProtectedRoute allowedRoles={['HRAdmin']} strict>
              <HRLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/hr/dashboard" replace />} />
          <Route path="dashboard" element={<HRDashboardPage />} />
          <Route path="employees" element={<Navigate to="/hr/employees/permanent" replace />} />
          <Route path="employees/permanent" element={<EmployeeRecordsPage contractType="Permanent" />} />
          <Route path="employees/freelance" element={<EmployeeRecordsPage contractType="Freelance" />} />
          <Route path="employees/:contractType/new" element={<EmployeeFormPage />} />
          <Route path="employees/:contractType/:id" element={<EmployeeDetailPage />} />
          <Route path="employees/:contractType/:id/edit" element={<EmployeeFormPage />} />
          <Route path="leave-requests" element={<LeaveRequestPage />} />
          <Route path="hiring-requests" element={<HiringRequestPage />} />
          <Route path="reports/financial" element={<FinancialReportsPage />} />
          <Route path="reports/hiring" element={<HiringReportsPage />} />
        </Route>

        <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
      </Route>
    </Routes>
  );
}

export default App;
