export interface ManagementReportIncident {
  ticketId: number;
  ticketNo: string;
  title: string;
  programme: string | null;
  startedAt: string;
  restoredAt: string | null;
  minutes: number;
  ongoing: boolean;
  reportNo: string | null;
  liveMinutes: number;
  recordedMinutes: number;
  type: 'live' | 'recorded' | 'mixed';
  epgMissing: boolean;
}

export interface AvailabilityBlock {
  hoursPerDay: number;
  liveMinutes: number;
  downtimeMinutes: number;
  downtimePercent: number;
  availabilityPercent: number;
  incidentCount: number;
  cancelledMinutes: number;
  cancelledCount: number;
  cancelledPercent: number;
  cancelledIsPlaceholder: boolean;
}

export interface ManagementReport {
  month: string;
  isMonthToDate: boolean;
  from: string;
  to: string;
  generatedAt: string;
  availability: {
    days: number;
    hoursPerDay: number;
    liveMinutes: number;
    downtimeMinutes: number;
    downtimePercent: number;
    availabilityPercent: number;
    incidentCount: number;
    longestIncidentMinutes: number;
    live: AvailabilityBlock;
    recorded: AvailabilityBlock;
    incidents: ManagementReportIncident[];
  };
  guests: {
    appearances: number;
    distinctGuests: number;
    newGuests: number;
    spending: number;
    cancelled: number;
    topProgrammes: { name: string; appearances: number; spending: number }[];
    topGuests: { name: string; appearances: number; amount: number }[];
  };
  shoots: {
    total: number;
    indoor: number;
    outdoor: number;
    completed: number;
    cancelled: number;
    live: number;
    recorded: number;
    otherType: number;
    byDepartment: { name: string; indoor: number; outdoor: number; live: number }[];
  };
  tickets: {
    created: number;
    resolved: number;
    open: number;
    avgResolutionMinutes: number | null;
    slaCompliancePercent: number | null;
    byCategory: { key: string; count: number }[];
    byVendor: { vendorId: number; vendorName: string; count: number }[];
  };
}
