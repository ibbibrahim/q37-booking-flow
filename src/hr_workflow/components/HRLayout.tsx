import { Outlet } from 'react-router-dom';
import { useHrLanguage } from '../context/HrLanguageContext';

/** HR pages render directly in the shared app shell — navigation lives in the main sidebar's "HR System" group. */
export function HRLayout() {
  const { dir } = useHrLanguage();
  return (
    <div dir={dir}>
      <Outlet />
    </div>
  );
}
