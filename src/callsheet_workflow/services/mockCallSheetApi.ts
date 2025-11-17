// ------------------------------------------------------
// CallSheet API Client (Updated for Normalized DB Schema)
// ------------------------------------------------------

import apiClient from "@/utils/apiClient";
import type { CallSheetRequest } from "@/callsheet_workflow/types/callsheet";

const API_BASE = "/api/callsheet/requests";

export interface CallSheetFilters {
  startDate?: string;
  endDate?: string;
  crewRoles?: string[];
  crewMembers?: string[];
  searchQuery?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const parseCallSheet = (item: any): CallSheetRequest => ({
  ...item,
  crewAssignments: JSON.parse(item.crewAssignments || "[]"),
  departmentAcknowledgements: JSON.parse(item.departmentAcknowledgements || "[]"),
  equipment: JSON.parse(item.equipment || "[]"),
  transportRequest: item.transportRequest ? JSON.parse(item.transportRequest) : null,
  notifications: JSON.parse(item.notifications || "[]"),
  departmentsToApprove: JSON.parse(item.departmentsToApprove || "[]"),
  departmentsToNotify: JSON.parse(item.departmentsToNotify || "[]"),
});

export const callSheetApi = {
  // GET all call sheets with pagination and filtering
  getCallSheets: async (): Promise<CallSheetRequest[]> => {
    const { data } = await apiClient.get(API_BASE);

    return data.map(parseCallSheet);
  },

  // GET call sheets with pagination and filtering
  getCallSheetsAnalytics: async (filters: CallSheetFilters): Promise<PaginatedResponse<CallSheetRequest>> => {
    const params = new URLSearchParams();

    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.crewRoles && filters.crewRoles.length > 0) {
      filters.crewRoles.forEach(role => params.append('crewRoles', role));
    }
    if (filters.crewMembers && filters.crewMembers.length > 0) {
      filters.crewMembers.forEach(member => params.append('crewMembers', member));
    }
    if (filters.searchQuery) params.append('search', filters.searchQuery);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());

    const queryString = params.toString();
    const url = queryString ? `${API_BASE}/analytics?${queryString}` : `${API_BASE}/analytics`;

    const { data } = await apiClient.get(url);

    return {
      items: data.items.map(parseCallSheet),
      total: data.total,
      page: data.page,
      pageSize: data.pageSize,
      totalPages: data.totalPages,
    };
  },

  // GET unique crew roles from all call sheets
  getCrewRoles: async (): Promise<string[]> => {
    const { data } = await apiClient.get(`${API_BASE}/crew-roles`);
    return Array.isArray(data) ? data : [];
  },

  // GET crew members for a specific role
  getCrewMembers: async (roles?: string[]): Promise<string[]> => {
    const params = new URLSearchParams();
    if (roles && roles.length > 0) {
      roles.forEach(role => params.append('roles', role));
    }

    const queryString = params.toString();
    const url = queryString ? `${API_BASE}/crew-members?${queryString}` : `${API_BASE}/crew-members`;

    const { data } = await apiClient.get(url);
    return Array.isArray(data) ? data : [];
  },

  // ------------------------------------------------------
  // GET single call sheet by ID
  // ------------------------------------------------------
  getCallSheetById: async (id: number): Promise<CallSheetRequest> => {
    const { data } = await apiClient.get(`${API_BASE}/${id}`);

    return data as CallSheetRequest;
  },

  // ------------------------------------------------------
  // CREATE call sheet
  // ------------------------------------------------------
  createCallSheet: async (data: Partial<CallSheetRequest>): Promise<CallSheetRequest> => {
    // Send arrays/objects directly (normalized DB)
    const body = {
      ...data,
    };

    const { data: result } = await apiClient.post(API_BASE, body);
    return result as CallSheetRequest;
  },

  // ------------------------------------------------------
  // UPDATE call sheet
  // ------------------------------------------------------
  updateCallSheet: async (id: number, data: Partial<CallSheetRequest>): Promise<CallSheetRequest> => {
    const body = {
      ...data,
    };

    const { data: result } = await apiClient.put(`${API_BASE}/${id}`, body);
    return result as CallSheetRequest;
  },

  // ------------------------------------------------------
  // DELETE call sheet
  // ------------------------------------------------------
  deleteCallSheet: async (id: number): Promise<boolean> => {
    const res = await apiClient.delete(`${API_BASE}/${id}`);
    return res.status === 204 || res.status === 200;
  },
};
