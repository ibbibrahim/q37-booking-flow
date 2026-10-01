export type DtlRole = 'CR' | 'AssignmentTeam' | 'AssignmentLead' | 'Admin' | '';

export interface DtlGuest {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  company: string | null;
  country: string | null;
  address: string | null;
  passportLink: string | null;
  ibanLink: string | null;
  imageLink: string | null;
  created: string;
  updated: string;
}

export interface DtlLogEntry {
  text: string;
  at: string;
}

export interface DtlProgram {
  id: number;
  name: string;
  price: number;
  durationMinutes: number | null;
  created: string;
  updated: string;
}

export interface DtlBookingReportEntry {
  date: string;
  programName: string;
  price: number;
}

export interface DtlBookingReportRow {
  guestId: number;
  name: string;
  email: string | null;
  phone: string | null;
  imageLink: string | null;
  passportLink: string | null;
  ibanLink: string | null;
  programNames: string[];
  bookingCount: number;
  amount: number;
  entries: DtlBookingReportEntry[];
}

export interface DtlBookingReport {
  from: string | null;
  to: string | null;
  statuses: string[];
  grandTotal: number;
  rows: DtlBookingReportRow[];
}

export const DTL_BOOKING_STATUS = {
  Created: 'created',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
} as const;

export const DTL_TERMINAL_STATUSES: string[] = [
  DTL_BOOKING_STATUS.Completed,
  DTL_BOOKING_STATUS.Cancelled,
];

export interface DtlBooking {
  id: string;
  createdBy: string | null;
  sentBy: string | null;
  guestId: number | null;
  guestName: string | null;
  link: string | null;
  location: string | null;
  notes: string | null;
  logs: DtlLogEntry[] | null;
  programName: string;
  programId: number | null;
  status: string;
  time: string | null;
  durationMinutes: number | null;
  created: string;
  updated: string;
}

// Takes the user's full set of roles (a user can hold more than one, e.g. both AssignmentTeam and
// AssignmentLead) and unions the permissions each grants. Reducing to a single "highest" role before
// computing permissions was a bug: it silently dropped abilities from the other roles a user also held.
export function dtlPermissionsFor(roles: string[]) {
  const has = (r: string) => roles.includes(r);
  const isAdmin = has('Admin');
  const isCR = has('CR');
  const isAssignmentTeam = has('AssignmentTeam');
  const isAssignmentLead = has('AssignmentLead');
  const hasRole = isCR || isAssignmentTeam || isAssignmentLead || isAdmin;
  const canManageGuestsAndBookings = isAssignmentTeam || isAssignmentLead || isAdmin;
  const canUpdateStatus = isCR || isAssignmentTeam || isAssignmentLead || isAdmin;

  return {
    isAdmin,
    hasRole,
    canViewDashboard: isAssignmentLead || isAdmin,
    canListGuests: hasRole,
    canCreateGuest: canManageGuestsAndBookings,
    canEditGuest: canManageGuestsAndBookings,
    canDeleteGuest: canManageGuestsAndBookings,
    canListBookings: hasRole,
    canCreateBooking: canManageGuestsAndBookings,
    // Editing guest/program/location/time/duration is only offered while the booking is still "created".
    canEditBooking: canManageGuestsAndBookings,
    // Programs management (view the catalog, create/edit/soft-delete) is Admin + AssignmentLead only —
    // narrower than canManageGuestsAndBookings, which still covers AssignmentTeam for guests/bookings.
    canManagePrograms: isAssignmentLead || isAdmin,
    // Kept as two names for readability at call sites; both map to the same rule today.
    canCancel: canUpdateStatus,
    canComplete: canUpdateStatus,
    canEditLink: isCR || isAdmin,
    canSend: isCR || isAdmin,
    canViewHistory: hasRole,
    canAddLog: hasRole,
    canViewSentBy: isAdmin,
  };
}
