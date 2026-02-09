// ------------------------------------------------------
// CallSheet API Client (Updated for Normalized DB Schema)
// ------------------------------------------------------

import apiClient from "@/utils/apiClient";
import type { CallSheetRequest } from "@/callsheet_workflow/types/callsheet";

const API_BASE = "/api/callsheet/requests";

export interface InventoryCategory {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface InventoryAvailabilityItem {
  inventoryItemId: number;
  itemName: string;
  model?: string | null;
  totalOwned: number;
  overlappingReservedQty: number;
  overdueNotConfirmedQty: number;
  availableQty: number;
}

export interface InventoryAvailabilityResponse {
  start: string;
  end: string;
  endWithBuffer: string;
  items: InventoryAvailabilityItem[];
}

export const callSheetApi = {

  getCallSheets: async (): Promise<CallSheetRequest[]> => {
    const { data } = await apiClient.get(API_BASE);
    return data as CallSheetRequest[];
  },

  getCallSheetById: async (id: number): Promise<CallSheetRequest> => {
    const { data } = await apiClient.get(`${API_BASE}/${id}`);
    return data as CallSheetRequest;
  },

  createCallSheet: async (data: Partial<CallSheetRequest>): Promise<CallSheetRequest> => {
    // Send arrays/objects directly (normalized DB)
    const body = {
      ...data,
    };

    const { data: result } = await apiClient.post(API_BASE, body);
    return result as CallSheetRequest;
  },

  updateCallSheet: async (id: number, data: Partial<CallSheetRequest>): Promise<CallSheetRequest> => {
    const body = {
      ...data,
    };

    const { data: result } = await apiClient.put(`${API_BASE}/${id}`, body);
    return result as CallSheetRequest;
  },

  deleteCallSheet: async (id: number): Promise<boolean> => {
    const res = await apiClient.delete(`${API_BASE}/${id}`);
    return res.status === 204 || res.status === 200;
  },

  getCrewMembers: async (roles: string[]): Promise<string[]> => {
    const { data } = await apiClient.post("/api/callsheet/requests/crew-members", {
      roles
    });
    return data.members;
  },

  searchCallSheets: async (filters: any): Promise<any> => {
    const { data } = await apiClient.post("/api/callsheet/requests/search", filters);
    return data;
  },

  // Technical Store specific methods
  getTechnicalStoreCallSheets: async (): Promise<CallSheetRequest[]> => {
    const { data } = await apiClient.get(`${API_BASE}/technical-store`);
    return data as CallSheetRequest[];
  },

  updateTechnicalStore: async (
    id: number,
    data: { driverName?: string; driverNo?: string; equipment?: any[] }
  ): Promise<CallSheetRequest> => {
    const { data: result } = await apiClient.put(`${API_BASE}/${id}/technical-store`, data);
    return result as CallSheetRequest;
  },

  getInventoryCategories: async (): Promise<InventoryCategory[]> => {
    const { data } = await apiClient.get('/api/inventory/categories');
    return data as InventoryCategory[];
  },

  getInventoryAvailability: async (
    start: string,
    end: string,
    categoryId: number,
    excludeCallsheetId?: number
  ): Promise<InventoryAvailabilityResponse> => {
    const params: any = { start, end, categoryId };
    if (excludeCallsheetId) {
      params.excludeCallsheetId = excludeCallsheetId;
    }
    const { data } = await apiClient.get('/api/inventory/items/availability', { params });
    return data as InventoryAvailabilityResponse;
  },

  announceCallSheet: async (
    id: number,
    payload: { to: string[]; cc: string[]; noteHtml: string }
  ): Promise<void> => {
    await apiClient.post(`${API_BASE}/${id}/announce`, payload);
  },
};
