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
  color: string;
  isActive: boolean;
  employeeCount?: number;
  requiresTimeRange?: boolean;
  usesShifts?: boolean;
  allowsCustomLabels?: boolean;
  /** Ordered sub-department header names (from public week API). */
  subDepartmentNames?: string[];
  /** Department-defined shift types (required for scheduling) */
  shiftTypes: RotaShiftType[];
}

export interface RotaEmployee {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  departmentId: number;
  departmentName?: string;
  preferredShift?: string;
  isActive: boolean;
}

export interface RotaAssignment {
  id: number;
  rotaWeekId: number;
  employeeId: number;
  employeeName: string;
  shiftDate: string;
  /** FK to department shift type */
  shiftTypeId?: number;
  /** Populated by API when loading assignments */
  shiftType?: RotaShiftType;
  notes?: string;
  customLabel?: string;
  programName?: string;
  assignmentComments?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  isOffDay?: boolean;
}

export interface RotaWeek {
  id: number;
  weekStartDate: string;
  departmentId: number;
  departmentName: string;
  /** Populated on public week responses when the department has sub-teams. */
  hasSubDepartments?: boolean;
  /** Ordered sub-department names, e.g. ["BIT", "Dev"]. */
  subDepartments?: string[];
  status: 'draft' | 'published' | 'archived';
  publicShareUuid?: string;
  shareExpiresAt?: string;
  shareViewCount: number;
  assignments: RotaAssignment[];
  coverageStats?: CoverageStats;
  employees?: RotaEmployee[];
}

export interface CoverageStats {
  totalRequired: number;
  totalAssigned: number;
  coveragePercentage: number;
  understaffedShifts: number;
}

/** Payload when assigning from drag/drop or modal (replaces legacy string shiftType). */
export interface RotaAssignPayload {
  isOffDay?: boolean;
  shiftTypeId?: number;
  shiftType?: RotaShiftType;
  customLabel?: string;
  programName?: string;
}

export interface BulkAssignDto {
  rotaWeekId: number;
  assignments: {
    employeeId: number;
    shiftDate: string;
    shiftTypeId?: number;
    customLabel?: string;
    programName?: string;
    assignmentComments?: string;
    shiftStartTime?: string;
    shiftEndTime?: string;
    isOffDay?: boolean;
  }[];
}
