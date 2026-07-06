import { Outlet } from 'react-router-dom';

/** HR pages render directly in the shared app shell — navigation lives in the main sidebar's "HR System" group. */
export function HRLayout() {
  return <Outlet />;
}
