export interface RotaDepartment {
  id: number;
  name: string;
  description?: string;
  color: string; // Hex color for UI
  morningRequired: number;
  eveningRequired: number;
  nightRequired: number;
  isActive: boolean;
  employeeCount?: number;
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
  shiftType: 'morning' | 'evening' | 'night';
  notes?: string;
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
    shiftType: 'morning' | 'evening' | 'night';
  }[];
}
