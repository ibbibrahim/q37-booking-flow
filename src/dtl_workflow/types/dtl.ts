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

export function dtlPermissionsFor(role: DtlRole) {
  const isAdmin = role === 'Admin';
  const isCR = role === 'CR';
  const isAssignmentTeam = role === 'AssignmentTeam';
  const isAssignmentLead = role === 'AssignmentLead';
  const hasRole = isCR || isAssignmentTeam || isAssignmentLead || isAdmin;
  const canManageGuestsAndBookings = isAssignmentTeam || isAssignmentLead || isAdmin;
  const canUpdateStatus = isCR || isAssignmentTeam || isAdmin;

  return {
    isAdmin,
    hasRole,
    canViewDashboard: isAssignmentLead || isAdmin,
    canListGuests: hasRole,
    canCreateGuest: canManageGuestsAndBookings,
    canEditGuest: canManageGuestsAndBookings,
    canListBookings: hasRole,
    canCreateBooking: canManageGuestsAndBookings,
    canManagePrograms: canManageGuestsAndBookings,
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
