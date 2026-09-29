import { useAuth } from '../../contexts/AuthContext';
import { dtlPermissionsFor, type DtlRole } from '../types/dtl';

// A user could in principle hold more than one DTL role; when they do, the
// most-privileged one wins so their permissions are the superset.
export function useDtlRole(): { role: DtlRole; displayName: string } {
  const { user } = useAuth();
  const roles = user?.roles ?? [];

  let role: DtlRole = '';
  if (roles.includes('Admin')) role = 'Admin';
  else if (roles.includes('AssignmentLead')) role = 'AssignmentLead';
  else if (roles.includes('AssignmentTeam')) role = 'AssignmentTeam';
  else if (roles.includes('CR')) role = 'CR';

  const displayName = user?.displayName || user?.username || 'Unknown';

  return { role, displayName };
}

export function useDtlPermissions() {
  const { role } = useDtlRole();
  return dtlPermissionsFor(role);
}
