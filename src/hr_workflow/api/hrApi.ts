import apiClient from '@/utils/apiClient';
import type {
  HrDepartment,
  HrSection,
  HrEmployee,
  HrEmployeeQuery,
  HrEmployeeListResult,
  CreateHrEmployeeDto,
  UpdateHrEmployeeStatusDto,
  ConvertToPermanentDto,
} from '../types/hrApi';

const API_BASE = '/api/hr';

export const hrApi = {
  // Departments
  getDepartments: async (): Promise<HrDepartment[]> => {
    const { data } = await apiClient.get(`${API_BASE}/departments`);
    return data;
  },

  // Sections
  getSections: async (departmentId?: number): Promise<HrSection[]> => {
    const { data } = await apiClient.get(`${API_BASE}/sections`, {
      params: departmentId ? { departmentId } : undefined,
    });
    return data;
  },

  // Employees
  searchEmployees: async (query: HrEmployeeQuery): Promise<HrEmployeeListResult> => {
    const { data } = await apiClient.get(`${API_BASE}/employees`, { params: query });
    return data;
  },

  getEmployee: async (id: number): Promise<HrEmployee> => {
    const { data } = await apiClient.get(`${API_BASE}/employees/${id}`);
    return data;
  },

  createEmployee: async (dto: CreateHrEmployeeDto): Promise<HrEmployee> => {
    const { data } = await apiClient.post(`${API_BASE}/employees`, dto);
    return data;
  },

  updateEmployee: async (id: number, dto: CreateHrEmployeeDto): Promise<HrEmployee> => {
    const { data } = await apiClient.put(`${API_BASE}/employees/${id}`, dto);
    return data;
  },

  updateEmployeeStatus: async (id: number, dto: UpdateHrEmployeeStatusDto): Promise<HrEmployee> => {
    const { data } = await apiClient.patch(`${API_BASE}/employees/${id}/status`, dto);
    return data;
  },

  convertToPermanent: async (id: number, dto: ConvertToPermanentDto): Promise<HrEmployee> => {
    const { data } = await apiClient.patch(`${API_BASE}/employees/${id}/convert-to-permanent`, dto);
    return data;
  },

  // Documents — uploaded via the backend (multipart -> Blob Storage), not signed URLs.
  // apiClient defaults Content-Type to application/json for every request, so it must be
  // explicitly cleared here — otherwise the browser can't attach the multipart boundary
  // and the backend rejects the request with 415 Unsupported Media Type.
  uploadProfilePicture: async (id: number, file: File): Promise<HrEmployee> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post(`${API_BASE}/employees/${id}/profile-picture`, formData, {
      headers: { 'Content-Type': undefined },
    });
    return data;
  },

  uploadContractAttachment: async (id: number, file: File): Promise<HrEmployee> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post(`${API_BASE}/employees/${id}/contracts`, formData, {
      headers: { 'Content-Type': undefined },
    });
    return data;
  },

  deleteContractAttachment: async (id: number, attachmentId: number): Promise<void> => {
    await apiClient.delete(`${API_BASE}/employees/${id}/contracts/${attachmentId}`);
  },
};
