import apiClient from "@/utils/apiClient";
import type { CallSheetRequest } from "@/callsheet_workflow/types/callsheet";

const API_BASE = "/api/callsheet/requests";

export const callSheetApi = {
  // GET all call sheets
  getCallSheets: async (): Promise<CallSheetRequest[]> => {
    const { data } = await apiClient.get(API_BASE);

    return data.map((item: any) => ({
      ...item,
      crewAssignments: JSON.parse(item.crewAssignments || "[]"),
      departmentAcknowledgements: JSON.parse(item.departmentAcknowledgements || "[]"),
      equipment: JSON.parse(item.equipment || "[]"),
      transportRequest: item.transportRequest ? JSON.parse(item.transportRequest) : null,
      notifications: JSON.parse(item.notifications || "[]"),
      departmentsToApprove: JSON.parse(item.departmentsToApprove || "[]"),
      departmentsToNotify: JSON.parse(item.departmentsToNotify || "[]"),
    }));
  },

  // GET single call sheet
  getCallSheetById: async (id: number): Promise<CallSheetRequest> => {
    const { data } = await apiClient.get(`${API_BASE}/${id}`);

    return {
      ...data,
      crewAssignments: JSON.parse(data.crewAssignments || "[]"),
      departmentAcknowledgements: JSON.parse(data.departmentAcknowledgements || "[]"),
      equipment: JSON.parse(data.equipment || "[]"),
      transportRequest: data.transportRequest ? JSON.parse(data.transportRequest) : null,
      notifications: JSON.parse(data.notifications || "[]"),
      departmentsToApprove: JSON.parse(data.departmentsToApprove || "[]"),
      departmentsToNotify: JSON.parse(data.departmentsToNotify || "[]"),
    };
  },

  // POST create
  createCallSheet: async (data: Partial<CallSheetRequest>): Promise<CallSheetRequest> => {
    const body = {
      ...data,
      crewAssignments: JSON.stringify(data.crewAssignments || []),
      departmentAcknowledgements: JSON.stringify(data.departmentAcknowledgements || []),
      equipment: JSON.stringify(data.equipment || []),
      transportRequest: JSON.stringify(data.transportRequest || {}),
      notifications: JSON.stringify(data.notifications || []),
      departmentsToApprove: JSON.stringify(data.departmentsToApprove || []),
      departmentsToNotify: JSON.stringify(data.departmentsToNotify || []),
    };

    const { data: result } = await apiClient.post(API_BASE, body);
    return result;
  },

  // PUT update
  updateCallSheet: async (id: number, data: Partial<CallSheetRequest>): Promise<CallSheetRequest> => {
    const body = {
      ...data,
      crewAssignments: JSON.stringify(data.crewAssignments || []),
      departmentAcknowledgements: JSON.stringify(data.departmentAcknowledgements || []),
      equipment: JSON.stringify(data.equipment || []),
      transportRequest: JSON.stringify(data.transportRequest || {}),
      notifications: JSON.stringify(data.notifications || []),
      departmentsToApprove: JSON.stringify(data.departmentsToApprove || []),
      departmentsToNotify: JSON.stringify(data.departmentsToNotify || []),
    };

    const { data: result } = await apiClient.put(`${API_BASE}/${id}`, body);
    return result;
  },

  // DELETE
  deleteCallSheet: async (id: number): Promise<boolean> => {
    const res = await apiClient.delete(`${API_BASE}/${id}`);
    return res.status === 204 || res.status === 200;
  },
};
