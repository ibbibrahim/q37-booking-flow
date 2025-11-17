// ------------------------------------------------------
// CallSheet API Client (Updated for Normalized DB Schema)
// ------------------------------------------------------

import apiClient from "@/utils/apiClient";
import type { CallSheetRequest } from "@/callsheet_workflow/types/callsheet";

const API_BASE = "/api/callsheet/requests";

export const callSheetApi = {
  // ------------------------------------------------------
  // GET all call sheets
  // ------------------------------------------------------
  getCallSheets: async (): Promise<CallSheetRequest[]> => {
    const { data } = await apiClient.get(API_BASE);

    // Backend now returns real arrays/objects -> no parsing needed
    return data as CallSheetRequest[];
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
