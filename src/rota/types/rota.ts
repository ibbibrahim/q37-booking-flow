export interface RotaShiftType {
  id: number;
  departmentId: number;
  name: string;
  label: string;
  startTime: string;
  endTime: string;
  color: string;
  displayOrder: number;
  isActive: boolean;
}

export interface CreateShiftTypeDto {
  name: string;
  label: string;
  startTime: string;
  endTime: string;
  color?: string;
  displayOrder: number;
}

export interface RotaDepartment {
  id: number;
  name: string;
  parentDepartmentId?: number;
  parentDepartmentName?: string;
  hasSubDepartments?: boolean;
  subDepartments?: RotaDepartment[];
  description?: string;
  color: string; // Hex color for UI
  isActive: boolean;
  employeeCount?: number;
  requiresTimeRange?: boolean;
  /** Shift timings - e.g. "06:00", "14:00" */
  morningStartTime?: string;
  morningEndTime?: string;
  eveningStartTime?: string;
  eveningEndTime?: string;
  nightStartTime?: string;
  nightEndTime?: string;
  usesShifts?: boolean;
  allowsCustomLabels?: boolean;
  shiftTypes?: RotaShiftType[];
}

export interface RotaEmployee {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  departmentId: number;
  departmentName?: string;
  preferredShift?: 'morning' | 'evening' | 'night';
  isActive: boolean;
}

export interface RotaAssignment {
  id: number;
  rotaWeekId: number;
  employeeId: number;
  employeeName: string;
  shiftDate: string; // ISO date string
  shiftType?: string;
  notes?: string;
  customLabel?: string;
  programName?: string;
  assignmentComments?: string;
  shiftStartTime?: string; // "09:00:00"
  shiftEndTime?: string; // "17:00:00"
  isOffDay?: boolean;
}

export interface RotaWeek {
  id: number;
  weekStartDate: string; // ISO date (always Sunday in this case)
  departmentId: number;
  departmentName: string;
  status: 'draft' | 'published' | 'archived';
  publicShareUuid?: string;
  shareExpiresAt?: string;
  shareViewCount: number;
  assignments: RotaAssignment[];
  coverageStats?: CoverageStats;
  /** Optional - may be returned with public/week API */
  morningRequired?: number;
  eveningRequired?: number;
  nightRequired?: number;
  /** Optional - employees for public view (employee-first layout) */
  employees?: RotaEmployee[];
}

export interface CoverageStats {
  totalRequired: number;
  totalAssigned: number;
  coveragePercentage: number;
  understaffedShifts: number;
}

export interface BulkAssignDto {
  rotaWeekId: number;
  assignments: {
    employeeId: number;
    shiftDate: string;
    shiftType?: string;
    customLabel?: string;
    programName?: string;
    assignmentComments?: string;
    shiftStartTime?: string;
    shiftEndTime?: string;
    isOffDay?: boolean;
  }[];
}
