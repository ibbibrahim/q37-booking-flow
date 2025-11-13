import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './components/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import { BookingDashboard } from './booking_workflow/components/BookingDashboard';
import { RoleView } from './booking_workflow/components/RoleView';
import { RequestDetail } from './booking_workflow/components/RequestDetail';
import { CallSheetRoleView } from './callsheet_workflow/components/CallSheetRoleView';
import { CallSheetDetail } from './callsheet_workflow/components/CallSheetDetail';
import { UnauthorizedPage } from './components/UnauthorizedPage';

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <BookingDashboard />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/booking" replace />} />

        {/* Booking role */}
        <Route
          path="booking"
          element={
            <ProtectedRoute requiredRoles={['Booking', 'Admin']}>
              <RoleView role="Booking" />
            </ProtectedRoute>
          }
        />
        <Route
          path="booking/new"
          element={
            <ProtectedRoute requiredRoles={['Booking', 'Admin']}>
              <RoleView role="Booking" />
            </ProtectedRoute>
          }
        />
        <Route
          path="booking/request/:id"
          element={
            <ProtectedRoute requiredRoles={['Booking', 'NOC', 'Ingest', 'Admin']}>
              <RequestDetail />
            </ProtectedRoute>
          }
        />

        {/* NOC role */}
        <Route
          path="noc"
          element={
            <ProtectedRoute requiredRoles={['NOC', 'Admin']}>
              <RoleView role="NOC" />
            </ProtectedRoute>
          }
        />
        <Route
          path="noc/request/:id"
          element={
            <ProtectedRoute requiredRoles={['NOC', 'Ingest', 'Admin']}>
              <RequestDetail />
            </ProtectedRoute>
          }
        />

        {/* Ingest role */}
        <Route
          path="ingest"
          element={
            <ProtectedRoute requiredRoles={['Ingest', 'Admin']}>
              <RoleView role="Ingest" />
            </ProtectedRoute>
          }
        />
        <Route
          path="ingest/request/:id"
          element={
            <ProtectedRoute requiredRoles={['Ingest', 'NOC', 'Admin']}>
              <RequestDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="ingest/new"
          element={
            <ProtectedRoute requiredRoles={['Ingest', 'Admin']}>
              <RoleView role="Ingest" />
            </ProtectedRoute>
          }
        />

        {/* Admin role */}
        <Route
          path="admin"
          element={
            <ProtectedRoute requiredRoles={['Admin']}>
              <RoleView role="Admin" />
            </ProtectedRoute>
          }
        />

        {/* Call Sheet Workflow */}
        <Route
          path="callsheet"
          element={
            <ProtectedRoute>
              <CallSheetRoleView view="list" />
            </ProtectedRoute>
          }
        />
        <Route
          path="callsheet/new"
          element={
            <ProtectedRoute>
              <CallSheetRoleView view="new" />
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

        <Route path="*" element={<Navigate to="/booking" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
