export type CallSheetStatus =
  | 'Draft'
  | 'With Technical Store'
  | 'Submitted'
  | 'Completed'
  | 'Cancelled';
export interface CrewAssignment {
  id: number;             // DB PK → number, not string
  role: string;
  name: string;
  phone: string;
}
export interface DepartmentAcknowledgement {
  id?: number;            // backend will generate
  department: string;
  acknowledged: boolean;
  approved: boolean;
  comment: string;
}

// -----------------------------
// Equipment Table
// -----------------------------
export interface Equipment {
  id: number;             // DB PK → number
  category: string;
  item: string;
  quantity: number;
}

// -----------------------------
// Transport Request Table
// -----------------------------
export interface TransportRequest {
  id?: number;            // backend PK
  callSheetRequestId?: number;
  reason: string;
  startDateTime: string;
  returnDateTime: string;
  driverName: string;
  vehicleNo: string;
  carType?: string;       // optional (SUV/Van)
  requestedBy:  string | number;    // always number
}

// -----------------------------
// Notification Preferences
// -----------------------------
export interface Notification {
  id: string;
  label: string;
  enabled: boolean;
}

// -----------------------------
// Main CallSheetRequest
// -----------------------------
export interface CallSheetRequest {
  id: number;

  department: string;
  title: string;
  filmingDate: string;         // ISO Date (string is fine)
  callTime: string | null;     // can be null
  wrapTime: string | null;

  location: string;
  focalPoint: string;
  focalPointContact: string;

  driverNeeded: boolean;

  // Child Tables
  crewAssignments: CrewAssignment[];
  departmentAcknowledgements: DepartmentAcknowledgement[];
  equipment: Equipment[];
  departmentsToApprove: string[];
  departmentsToNotify: string[];

  transportRequest: TransportRequest | null;
  notifications: Notification[];

  status: CallSheetStatus;
  createdBy:  string | number;           // always integer
  createdAt: string;
  updatedAt: string;
}

// -----------------------------
// Static Lists
// -----------------------------
export const DEPARTMENTS = [
  'News and Digital Media',
  'QTV37 Production',
  'QBusiness',
];

export const CALL_SHEET_ROLES = [
  'Director',
  'Producer',
  'Presenter',
  'Assistant Director',
  'Camera 1',
  'Camera 2',
  'Camera 3',
  'Camera Assistant',
  'Sound Technician',
  'Studio Operator',
];

export const EQUIPMENT_CATEGORIES = {
  Camera: ['Z90', 'FX6', 'GoPro', 'A7S III', 'Canon C300'],
  Lighting: ['LED Panel 1x1', 'Softbox', 'Ring Light', 'Spotlight', 'Reflector'],
  Sound: ['Wireless Mic', 'Boom Mic', 'Lavalier', 'Audio Recorder', 'Headphones'],
  'SD Cards': ['64GB', '128GB', '256GB', '512GB'],
};

export const TRANSPORT_REASONS = [
  'Filming',
  'Recce',
  'Meeting',
  'Equipment Transport',
  'Other',
];

export const DEFAULT_NOTIFICATIONS: Notification[] = [
  { id: '1', label: 'T–1 Day — Team Call & Location', enabled: true },
  { id: '2', label: 'T Day 08:00 — Equipment Ready', enabled: true },
  { id: '3', label: '+30 min after Wrap — Return Reminder', enabled: true },
  { id: '4', label: 'On Conflict — Manager Escalation', enabled: false },
];

// Default Acknowledgements (Frontend template)
export const DEPARTMENT_ACKNOWLEDGEMENTS: DepartmentAcknowledgement[] = [
  { department: 'News Media Dept', acknowledged: false, approved: false, comment: '' },
  { department: '37TV Production Team', acknowledged: false, approved: false, comment: '' },
  { department: 'Technical Support', acknowledged: false, approved: false, comment: '' },
  { department: 'Storekeeper', acknowledged: false, approved: false, comment: '' },
];
