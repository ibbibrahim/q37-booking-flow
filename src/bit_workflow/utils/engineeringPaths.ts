import type { ChecklistTeam, ChecklistType } from '../types/checklist';
import { canAccessTeam, isChecklistTeam, isChecklistType, teamTypes } from './checklistUtils';

export const ENG_BASE = '/engineering';

export const ENG_PATHS = {
  tickets: `${ENG_BASE}/tickets`,
  ticketReports: `${ENG_BASE}/tickets/reports`,
  incidents: `${ENG_BASE}/incidents`,
  vendors: `${ENG_BASE}/vendors`,
} as const;

export const checklistHome = (team: ChecklistTeam) => `${ENG_BASE}/checklists/${team}`;
export const checklistList = (team: ChecklistTeam, type: ChecklistType) => `${checklistHome(team)}/${type}`;
export const checklistForm = (team: ChecklistTeam, type: ChecklistType) => `${checklistList(team, type)}/form`;
export const checklistView = (team: ChecklistTeam, type: ChecklistType, id: number) => `${checklistList(team, type)}/view/${id}`;
export const checklistManage = (team: ChecklistTeam, type: ChecklistType) => `${checklistList(team, type)}/manage`;
export const ticketPath = (id: number | string) => `${ENG_PATHS.tickets}/${id}`;
export const incidentReportPath = (id: number | string) => `${ticketPath(id)}/report`;

/**
 * Where a checklist route must redirect to, or null when the user may stay.
 * Unknown/forbidden team → /engineering; type not offered for the team → that team's home.
 */
export function checklistRouteRedirect(
  roles: string[] | undefined,
  team: string | undefined,
  type?: string
): string | null {
  if (!isChecklistTeam(team) || !canAccessTeam(roles, team)) return ENG_BASE;
  if (type !== undefined && (!isChecklistType(type) || !teamTypes(team).includes(type))) return checklistHome(team);
  return null;
}

/** Maps a legacy /bit/... pathname to its /engineering/... equivalent (old emails, bookmarks, notifications). */
export function legacyBitToEngineering(pathname: string): string {
  const rest = pathname.replace(/^\/bit\/?/, '').replace(/\/$/, '');
  if (rest === '') return ENG_BASE;
  if (rest === 'checklist') return checklistHome('bit');
  if (rest.startsWith('checklist/')) return `${checklistHome('bit')}/${rest.slice('checklist/'.length)}`;
  return `${ENG_BASE}/${rest}`;
}
