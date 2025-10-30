import { Routes, Route, Navigate } from 'react-router-dom';
import { BookingDashboard } from './booking_workflow/components/BookingDashboard';
import { RoleView } from './booking_workflow/components/RoleView';

function App() {
  return (
    <Routes>
      <Route path="/" element={<BookingDashboard />}>
        <Route index element={<Navigate to="/booking" replace />} />
        <Route path="booking" element={<RoleView role="Booking" />} />
        <Route path="booking/new" element={<RoleView role="Booking" />} />
        <Route path="noc" element={<RoleView role="NOC" />} />
        <Route path="noc/new" element={<RoleView role="NOC" />} />
        <Route path="ingest" element={<RoleView role="Ingest" />} />
        <Route path="ingest/new" element={<RoleView role="Ingest" />} />
        <Route path="admin" element={<RoleView role="Admin" />} />
        <Route path="*" element={<Navigate to="/booking" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
