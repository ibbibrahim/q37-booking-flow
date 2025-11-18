// ------------------------------------------------------
// CallSheet API Client (Updated for Normalized DB Schema)
// ------------------------------------------------------

import apiClient from "@/utils/apiClient";
import type { CallSheetRequest } from "@/callsheet_workflow/types/callsheet";

const API_BASE = "/api/callsheet/requests";

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
};
