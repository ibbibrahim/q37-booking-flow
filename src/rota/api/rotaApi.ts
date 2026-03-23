import apiClient from '@/utils/apiClient';
import type {
  RotaDepartment,
  RotaEmployee,
  RotaWeek,
  RotaShiftType,
  CreateShiftTypeDto,
  BulkAssignDto,
} from '../types/rota';

const API_BASE = '/api/rota';

export const rotaApi = {
  // Departments
  getDepartments: async (): Promise<RotaDepartment[]> => {
    const { data } = await apiClient.get(`${API_BASE}/departments`);
    return data;
  },

  getDepartmentEmployees: async (
    departmentId: number
  ): Promise<RotaEmployee[]> => {
    const { data } = await apiClient.get(
      `${API_BASE}/departments/${departmentId}/employees`
    );
    return data;
  },

  getDepartmentShiftTypes: async (
    departmentId: number
  ): Promise<RotaShiftType[]> => {
    const { data } = await apiClient.get(
      `${API_BASE}/departments/${departmentId}/shift-types`
    );
    return data;
  },

  createShiftType: async (
    departmentId: number,
    dto: CreateShiftTypeDto
  ): Promise<RotaShiftType> => {
    const { data } = await apiClient.post(
      `${API_BASE}/departments/${departmentId}/shift-types`,
      dto
    );
    return data;
  },

  updateShiftType: async (
    departmentId: number,
    id: number,
    dto: Partial<CreateShiftTypeDto>
  ): Promise<RotaShiftType> => {
    const { data } = await apiClient.put(
      `${API_BASE}/departments/${departmentId}/shift-types/${id}`,
      dto
    );
    return data;
  },

  deleteShiftType: async (
    departmentId: number,
    id: number
  ): Promise<void> => {
    await apiClient.delete(
      `${API_BASE}/departments/${departmentId}/shift-types/${id}`
    );
  },

  // Weeks
  getWeek: async (
    weekStart: string,
    departmentId: number
  ): Promise<RotaWeek> => {
    const { data } = await apiClient.get(`${API_BASE}/weeks`, {
      params: { weekStart, departmentId },
    });
    return data;
  },

  publishWeek: async (weekId: number): Promise<RotaWeek> => {
    const { data } = await apiClient.put(`${API_BASE}/weeks/${weekId}/publish`);
    return data;
  },

  generateShareLink: async (
    weekId: number,
    expiresAt?: string
  ): Promise<{ publicUrl: string; uuid: string }> => {
    const { data } = await apiClient.post(`${API_BASE}/weeks/${weekId}/share`, {
      expiresAt,
    });
    return data;
  },

  getPublicWeek: async (uuid: string): Promise<RotaWeek> => {
    const { data } = await apiClient.get(`${API_BASE}/weeks/public/${uuid}`);
    return data;
  },

  autoRotate: async (weekId: number): Promise<RotaWeek> => {
    const { data } = await apiClient.post(
      `${API_BASE}/weeks/${weekId}/auto-rotate`
    );
    return data;
  },

  copyFromWeek: async (targetWeekId: number, sourceWeekId: number): Promise<RotaWeek> => {
    const { data } = await apiClient.post(
      `${API_BASE}/weeks/${targetWeekId}/copy-from/${sourceWeekId}`
    );
    return data;
  },

  // Assignments
  bulkAssign: async (dto: BulkAssignDto): Promise<void> => {
    await apiClient.post(`${API_BASE}/assignments/bulk`, dto);
  },

  deleteAssignment: async (assignmentId: number): Promise<void> => {
    await apiClient.delete(`${API_BASE}/assignments/${assignmentId}`);
  },
};
