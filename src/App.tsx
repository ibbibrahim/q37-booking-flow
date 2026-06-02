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

function App() {
  const { isAuthenticated, user, isLoading } = useAuth();

  // 🔥 1. Choose default route based on ROLE
  const getDefaultRoute = () => {
    if (!user || !user.roles) return "/login";

    if (user.roles.includes("Admin")) return "/admin";
    if (user.roles.includes("NOC")) return "/noc";
    if (user.roles.includes("Ingest")) return "/ingest";
    if (user.roles.includes("Booking")) return "/booking";
    if (user.roles.includes("TechnicalStore")) return "/inventory";
    if (user.roles.includes("Callsheet")) return "/callsheet";
    if (user.roles.includes("Editor")) return "/editor-queue";
    if (user.roles.includes("RotaTeamLead")) return "/rota";

    return "/unauthorized";
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
        <Route
          path="studio-booking"
          element={
            <ProtectedRoute>
              <StudioBookingDashboard />
            </ProtectedRoute>
          }
        />

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

        <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
      </Route>
    </Routes>
  );
}

export default App;
