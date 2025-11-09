import type { CallSheetRequest } from '../types/callsheet';

let callSheets: CallSheetRequest[] = [];

export const mockCallSheetApi = {
  getCallSheets: async (): Promise<CallSheetRequest[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [...callSheets];
  },

  getCallSheetById: async (id: string): Promise<CallSheetRequest | null> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return callSheets.find(cs => cs.id === id) || null;
  },

  createCallSheet: async (data: Partial<CallSheetRequest>): Promise<CallSheetRequest> => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const newCallSheet: CallSheetRequest = {
      id: `cs-${Date.now()}`,
      department: data.department || '',
      title: data.title || '',
      filmingDate: data.filmingDate || '',
      callTime: data.callTime || '',
      wrapTime: data.wrapTime || '',
      location: data.location || '',
      focalPoint: data.focalPoint || '',
      focalPointContact: data.focalPointContact || '',
      driverNeeded: data.driverNeeded || false,
      crewAssignments: data.crewAssignments || [],
      departmentAcknowledgements: data.departmentAcknowledgements || [],
      equipment: data.equipment || [],
      departmentsToApprove: data.departmentsToApprove || [],
      departmentsToNotify: data.departmentsToNotify || [],
      transportRequest: data.transportRequest || null,
      notifications: data.notifications || [],
      status: data.status || 'Draft',
      createdBy: data.createdBy || 'Current User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    callSheets = [newCallSheet, ...callSheets];
    return newCallSheet;
  },

  updateCallSheet: async (id: string, data: Partial<CallSheetRequest>): Promise<CallSheetRequest | null> => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const index = callSheets.findIndex(cs => cs.id === id);
    if (index === -1) return null;

    callSheets[index] = {
      ...callSheets[index],
      ...data,
      updatedAt: new Date().toISOString()
    };

    return callSheets[index];
  },

  deleteCallSheet: async (id: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 300));

    const initialLength = callSheets.length;
    callSheets = callSheets.filter(cs => cs.id !== id);
    return callSheets.length < initialLength;
  }
};
