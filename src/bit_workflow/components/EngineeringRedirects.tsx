import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { defaultTeamFor } from '../utils/checklistUtils';
import { checklistHome, legacyBitToEngineering } from '../utils/engineeringPaths';

export function EngineeringHomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={checklistHome(defaultTeamFor(user?.roles))} replace />;
}

export function LegacyBitRedirect() {
  const { pathname, search } = useLocation();
  return <Navigate to={legacyBitToEngineering(pathname) + search} replace />;
}
