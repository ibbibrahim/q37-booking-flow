import { useAuth } from '../../contexts/AuthContext';
import { dtlPermissionsFor, type DtlRole } from '../types/dtl';

// `role` is a single "highest-privilege" label, handy for display purposes only (e.g. a badge).
// Permission checks must NOT be derived from it — a user can hold more than one DTL role at once
// (e.g. both AssignmentTeam and AssignmentLead), and reducing to one before checking permissions
// silently drops abilities the other role(s) also grant. useDtlPermissions below uses the full
// roles array instead, for exactly this reason.
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
  const { user } = useAuth();
  return dtlPermissionsFor(user?.roles ?? []);
}
