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
import { CallsheetAnalyticsDashboard } from './callsheet_workflow/components/CallsheetAnalyticsDashboard';

function App() {
  const { isAuthenticated, isLoading } = useAuth();

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
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/booking" replace /> : <Login />
      } />

      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route path="/" element={
        <ProtectedRoute>
          <BookingDashboard />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/booking" replace />} />

        <Route path="booking" element={
          <ProtectedRoute allowedRoles={['Booking', 'Admin']}>
            <RoleView role="Booking" />
          </ProtectedRoute>
        } />
        <Route path="booking/new" element={
          <ProtectedRoute allowedRoles={['Booking', 'Admin']}>
            <RoleView role="Booking" />
          </ProtectedRoute>
        } />
        <Route path="booking/request/:id" element={
          <ProtectedRoute allowedRoles={['Booking', 'Admin']}>
            <RequestDetail />
          </ProtectedRoute>
        } />

        <Route path="noc" element={
          <ProtectedRoute allowedRoles={['NOC', 'Admin']}>
            <RoleView role="NOC" />
          </ProtectedRoute>
        } />
        <Route path="noc/request/:id" element={
          <ProtectedRoute allowedRoles={['NOC', 'Admin']}>
            <RequestDetail />
          </ProtectedRoute>
        } />

        <Route path="ingest" element={
          <ProtectedRoute allowedRoles={['Ingest', 'Admin']}>
            <RoleView role="Ingest" />
          </ProtectedRoute>
        } />
        <Route path="ingest/request/:id" element={
          <ProtectedRoute allowedRoles={['Ingest', 'Admin']}>
            <RequestDetail />
          </ProtectedRoute>
        } />
        <Route path="ingest/new" element={
          <ProtectedRoute allowedRoles={['Ingest', 'Admin']}>
            <RoleView role="Ingest" />
          </ProtectedRoute>
        } />

        <Route path="admin" element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <RoleView role="Admin" />
          </ProtectedRoute>
        } />

        <Route path="callsheet" element={
          <ProtectedRoute>
            <CallSheetRoleView view="list" />
          </ProtectedRoute>
        } />
        <Route path="callsheet/new" element={
          <ProtectedRoute>
            <CallSheetRoleView view="new" />
          </ProtectedRoute>
        } />
        <Route path="callsheet/:id" element={
          <ProtectedRoute>
            <CallSheetDetail />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/booking" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
