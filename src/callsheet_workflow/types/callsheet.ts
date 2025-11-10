export type CallSheetStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled';

export interface CrewAssignment {
  id: string;
  role: string;
  name: string;
  phone: string;
}

export interface DepartmentAcknowledgement {
  department: string;
  acknowledged: boolean;
  approved: boolean;
  comment: string;
}

export interface Equipment {
  id: string;
  category: string;
  item: string;
  quantity: number;
}

export interface TransportRequest {
  reason: string;
  startDateTime: string;
  returnDateTime: string;
  driverName: string;
  vehicleNo: string;
  requestedBy: string | number;
}

export interface Notification {
  id: string;
  label: string;
  enabled: boolean;
}

export interface CallSheetRequest {
  id: number;
  department: string;
  title: string;
  filmingDate: string;      // ISO string
  callTime: string;         // HH:mm
  wrapTime: string;         // HH:mm
  location: string;
  focalPoint: string;
  focalPointContact: string;
  driverNeeded: boolean;
  crewAssignments: CrewAssignment[];
  departmentAcknowledgements: DepartmentAcknowledgement[];
  equipment: Equipment[];
  departmentsToApprove: string[];
  departmentsToNotify: string[];
  transportRequest: TransportRequest | null;
  notifications: Notification[];
  status: CallSheetStatus;
  createdBy: string | number;
  createdAt: string;
  updatedAt: string;
}


export const DEPARTMENTS = [
  'News Media',
  '37TV Production',
  'Technical Support',
  'Engineering',
  'IT Department',
  'Administration'
];

export const EQUIPMENT_CATEGORIES = {
  Camera: ['Z90', 'FX6', 'GoPro', 'A7S III', 'Canon C300'],
  Lighting: ['LED Panel 1x1', 'Softbox', 'Ring Light', 'Spotlight', 'Reflector'],
  Sound: ['Wireless Mic', 'Boom Mic', 'Lavalier', 'Audio Recorder', 'Headphones'],
  'SD Cards': ['64GB', '128GB', '256GB', '512GB']
};

export const TRANSPORT_REASONS = [
  'Filming',
  'Recce',
  'Meeting',
  'Equipment Transport',
  'Other'
];

export const DEFAULT_NOTIFICATIONS: Notification[] = [
  { id: '1', label: 'T–1 Day — Team Call & Location', enabled: true },
  { id: '2', label: 'T Day 08:00 — Equipment Ready', enabled: true },
  { id: '3', label: '+30 min after Wrap — Return Reminder', enabled: true },
  { id: '4', label: 'On Conflict — Manager Escalation', enabled: false }
];

export const DEPARTMENT_ACKNOWLEDGEMENTS: DepartmentAcknowledgement[] = [
  { department: 'News Media Dept', acknowledged: false, approved: false, comment: '' },
  { department: '37TV Production Team', acknowledged: false, approved: false, comment: '' },
  { department: 'Technical Support', acknowledged: false, approved: false, comment: '' },
  { department: 'Storekeeper', acknowledged: false, approved: false, comment: '' }
];
