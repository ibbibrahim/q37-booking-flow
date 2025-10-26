import React from 'react';
import { BookingDashboard } from './booking_workflow/components/BookingDashboard';

function App() {
  // Later, you can add routes or conditional modules like:
  // if (selectedModule === 'HR') return <HRDashboard />;
  // if (selectedModule === 'Production') return <ProductionDashboard />;

  return <BookingDashboard />;
}

export default App;
