import apiClient from '../../utils/apiClient';
import type {
  WorkflowRequest,
  WorkflowTransition,
  ResourceAssignment,
  WorkflowStatus,
  UserRole,
  UpdateDownloadLinkDto,
} from '../types/workflow';

/** POST /api/booking/requests/search body (optional fields omitted when unset). */
export interface BookingRequestSearchBody {
  page: number;
  pageSize: number;
  searchQuery?: string | null;
  status?: string | null;
  bookingType?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  createdAtFrom?: string | null;
  createdAtTo?: string | null;
}

export interface BookingRequestSearchResponse {
  total: number;
  page: number;
  pageSize: number;
  items: WorkflowRequest[];
}

function buildSearchPayload(body: BookingRequestSearchBody): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    page: body.page,
    pageSize: body.pageSize,
  };
  if (body.searchQuery?.trim()) payload.searchQuery = body.searchQuery.trim();
  if (body.status?.trim()) payload.status = body.status.trim();
  if (body.bookingType?.trim()) payload.bookingType = body.bookingType.trim();
  if (body.dateFrom) payload.dateFrom = body.dateFrom;
  if (body.dateTo) payload.dateTo = body.dateTo;
  if (body.createdAtFrom) payload.createdAtFrom = body.createdAtFrom;
  if (body.createdAtTo) payload.createdAtTo = body.createdAtTo;
  return payload;
}

function visibleForRole(req: WorkflowRequest, userRole: UserRole): boolean {
  if (userRole === 'NOC') {
    return (
      req.status === 'Submitted' ||
      req.status === 'With NOC' ||
      req.status === 'Clarification Requested' ||
      req.status === 'Resources Added' ||
      req.status === 'Completed' ||
      req.status === 'Partially Completed'
    );
  }
  if (userRole === 'Ingest') {
    return (
      req.status === 'With Ingest' ||
      req.status === 'Completed' ||
      req.status === 'Not Done' ||
      req.status === 'Partially Completed'
    );
  }
  return true;
}

function guestSearchText(req: WorkflowRequest): string {
  const g = req.guestDetail?.guestName;
  if (g) return g;
  const legacy = (req as WorkflowRequest & { guestName?: string }).guestName;
  return legacy ?? '';
}

function mockSearchBookingRequests(
  body: BookingRequestSearchBody,
  userRole: UserRole
): BookingRequestSearchResponse {
  let list = [...mockRequests];

  list = list.filter((req) => visibleForRole(req, userRole));

  const q = body.searchQuery?.trim().toLowerCase();
  if (q) {
    list = list.filter((req) => {
      const hay = [
        req.title,
        req.program,
        req.studio ?? '',
        req.notes ?? '',
        guestSearchText(req),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }

  if (body.status?.trim()) {
    list = list.filter((req) => req.status === body.status);
  }

  if (body.bookingType?.trim()) {
    list = list.filter((req) => req.bookingType === body.bookingType);
  }

  if (body.dateFrom || body.dateTo) {
    const fromT = body.dateFrom ? new Date(body.dateFrom).getTime() : -Infinity;
    const toT = body.dateTo ? new Date(body.dateTo).getTime() : Infinity;
    list = list.filter((req) => {
      if (!req.airDateTime) return false;
      const t = new Date(req.airDateTime).getTime();
      if (Number.isNaN(t)) return false;
      return t >= fromT && t <= toT;
    });
  }

  if (body.createdAtFrom || body.createdAtTo) {
    const fromT = body.createdAtFrom ? new Date(body.createdAtFrom).getTime() : -Infinity;
    const toT = body.createdAtTo ? new Date(body.createdAtTo).getTime() : Infinity;
    list = list.filter((req) => {
      const t = new Date(req.createdAt).getTime();
      if (Number.isNaN(t)) return false;
      return t >= fromT && t <= toT;
    });
  }

  const total = list.length;
  const page = Math.max(1, body.page);
  const pageSize = Math.max(1, body.pageSize);
  const start = (page - 1) * pageSize;
  const items = list.slice(start, start + pageSize);

  return {
    total,
    page,
    pageSize,
    items,
  };
}

export const mockRequests: WorkflowRequest[] = [
  {
    id: 'req-001',
    bookingType: 'Incoming Feed',
    title: 'Breaking News - Market Update',
    program: 'Business Today',
    airDateTime: '2025-10-22T14:00:00',
    language: 'English',
    priority: 'Urgent',
    sourceType: 'vMix',
    vmixInputNumber: 'Input 5',
    returnPath: 'Enabled',
    keyFill: 'Key',
    nocRequired: 'Yes',
    resourcesNeeded: 'Studio 2, Camera 3',
    newsroomTicket: 'TICK-1234',
    complianceTags: 'Financial, Live',
    notes: 'Requires real-time graphics overlay',
    status: 'With NOC',
    createdBy: 'Sarah Johnson',
    createdAt: '2025-10-21T10:30:00',
    updatedAt: '2025-10-21T11:45:00'
  },
  {
    id: 'req-002',
    bookingType: 'Invite Guest for Program',
    title: 'CEO Interview - Tech Innovations',
    program: 'Tech Talk',
    airDateTime: '2025-10-23T16:30:00',
    language: 'English',
    priority: 'High',
    guestName: 'John Martinez',
    guestContact: 'john.martinez@techcorp.com',
    inewsRundownId: 'RUN-2025-1021',
    storySlug: 'tech-ceo-interview',
    rundownPosition: 'Block 2',
    nocRequired: 'No',
    resourcesNeeded: 'Interview set, 2 mics',
    newsroomTicket: 'TICK-1235',
    complianceTags: 'Interview, Pre-recorded',
    notes: 'Guest arriving 30 mins early for makeup',
    status: 'Submitted',
    createdBy: 'Mike Chen',
    createdAt: '2025-10-21T09:15:00',
    updatedAt: '2025-10-21T09:15:00'
  },
  {
    id: 'req-003',
    bookingType: 'Incoming Feed',
    title: 'Live Trading Floor Feed',
    program: 'Market Watch',
    airDateTime: '2025-10-22T09:00:00',
    language: 'English',
    priority: 'Normal',
    sourceType: 'SRT',
    vmixInputNumber: 'Input 12',
    returnPath: 'Disabled',
    keyFill: 'None',
    nocRequired: 'Yes',
    resourcesNeeded: 'Encoder 3, Network feed',
    newsroomTicket: 'TICK-1236',
    complianceTags: 'Live, Financial',
    notes: 'Backup feed available on Satellite',
    status: 'Resources Added',
    createdBy: 'Sarah Johnson',
    createdAt: '2025-10-20T14:20:00',
    updatedAt: '2025-10-21T08:30:00'
  },
  {
    id: 'req-004',
    bookingType: 'Invite Guest for Program',
    title: 'Economic Analyst Panel',
    program: 'Business Insights',
    airDateTime: '2025-10-24T11:00:00',
    language: 'Arabic',
    priority: 'High',
    guestName: 'Dr. Fatima Al-Said',
    guestContact: 'f.alsaid@economist.org',
    inewsRundownId: 'RUN-2025-1022',
    storySlug: 'economic-panel',
    rundownPosition: 'Block 1',
    nocRequired: 'Yes',
    resourcesNeeded: 'Panel set, 4 mics, teleprompter',
    newsroomTicket: 'TICK-1237',
    complianceTags: 'Panel, Live',
    notes: 'Three additional panelists confirmed',
    status: 'With Ingest',
    createdBy: 'Ahmed Hassan',
    createdAt: '2025-10-19T16:00:00',
    updatedAt: '2025-10-21T10:00:00'
  },
  {
    id: 'req-005',
    bookingType: 'Incoming Feed',
    title: 'Stock Exchange Opening Bell',
    program: 'Morning Markets',
    airDateTime: '2025-10-22T08:30:00',
    language: 'English',
    priority: 'Urgent',
    sourceType: 'Satellite',
    vmixInputNumber: 'Input 8',
    returnPath: 'Enabled',
    keyFill: 'Fill',
    nocRequired: 'Yes',
    resourcesNeeded: 'Satellite receiver 2',
    newsroomTicket: 'TICK-1238',
    complianceTags: 'Live, Financial',
    notes: 'Critical timing - must be live at 08:30 sharp',
    status: 'Completed',
    createdBy: 'Sarah Johnson',
    createdAt: '2025-10-18T12:00:00',
    updatedAt: '2025-10-22T08:45:00'
  },
  {
    id: 'req-006',
    bookingType: 'Invite Guest for Program',
    title: 'Startup Founder Feature',
    program: 'Innovation Hub',
    airDateTime: '2025-10-25T14:00:00',
    language: 'English',
    priority: 'Normal',
    guestName: 'Lisa Park',
    guestContact: 'lisa@startuphub.com',
    inewsRundownId: 'RUN-2025-1023',
    storySlug: 'startup-feature',
    rundownPosition: 'Block 3',
    nocRequired: 'No',
    resourcesNeeded: 'Green screen, lighting kit',
    newsroomTicket: 'TICK-1239',
    complianceTags: 'Feature, Pre-recorded',
    notes: 'Product demo required - 5 min segment',
    status: 'Draft',
    createdBy: 'Mike Chen',
    createdAt: '2025-10-21T13:45:00',
    updatedAt: '2025-10-21T13:45:00'
  }
];

export const mockTransitions: WorkflowTransition[] = [
  {
    id: 'trans-001',
    requestId: '12',
    fromStatus: 'Submitted',
    toStatus: 'With NOC',
    changedBy: 'NOC Team',
    changedAt: '2025-10-21T11:45:00',
    comment: 'Reviewed and assigned resources'
  },
  {
    id: 'trans-002',
    requestId: '11',
    fromStatus: 'With NOC',
    toStatus: 'Resources Added',
    changedBy: 'NOC Team',
    changedAt: '2025-10-21T08:30:00',
    comment: 'Encoder configured and tested'
  }
];

export const mockResources: ResourceAssignment[] = [
  {
    id: 'res-001',
    requestId: 'req-001',
    resourceType: 'Equipment',
    resourceName: 'vMix Station 2',
    assignedBy: 'NOC Team',
    assignedAt: '2025-10-21T11:50:00'
  },
  {
    id: 'res-002',
    requestId: 'req-003',
    resourceType: 'Equipment',
    resourceName: 'SRT Encoder 3',
    assignedBy: 'NOC Team',
    assignedAt: '2025-10-21T08:30:00'
  }
];

export const mockApi = {
  getRequests: async (): Promise<WorkflowRequest[]> => {
    try {
      const response = await apiClient.get("/api/booking/requests");
      return response.data; // returns list of workflow requests from backend
    } catch (error) {
      console.warn("API unavailable, using mock data:", error);
      // Optional fallback (you can remove if you want strict backend)
      await new Promise((resolve) => setTimeout(resolve, 300));
      return mockRequests;
    }
  },

  searchBookingRequests: async (
    body: BookingRequestSearchBody,
    userRole: UserRole
  ): Promise<BookingRequestSearchResponse> => {
    try {
      const response = await apiClient.post(
        '/api/booking/requests/search',
        buildSearchPayload(body)
      );
      const data: BookingRequestSearchResponse = response.data;
      const filteredItems = data.items.filter((req) => visibleForRole(req, userRole));
      const removedCount = data.items.length - filteredItems.length;
      return {
        ...data,
        items: filteredItems,
        total: Math.max(0, data.total - removedCount),
      };
    } catch (error) {
      console.warn('Booking search API unavailable, using mock:', error);
      await new Promise((resolve) => setTimeout(resolve, 300));
      return mockSearchBookingRequests(body, userRole);
    }
  },

  getRequestById: async (id: string): Promise<WorkflowRequest | undefined> => {
    try {
      const response = await apiClient.get(`/api/booking/requests/${id}`);
      return response.data;
    } catch (error) {
      console.warn(`API unavailable, using mock data for request ${id}:`, error);
      await new Promise((resolve) => setTimeout(resolve, 300));
      // Return from local mock data
      return mockRequests.find((req) => req.id.toString() === id);
    }
  },
  
  
  createRequest: async ( request: Partial<WorkflowRequest>, status: WorkflowStatus): Promise<WorkflowRequest> => {
    const response = await apiClient.post("/api/booking/requests", {
      ...request,
      status,
    });
    return response.data;
  },

  assignNOCResources: async (id: string, payload: any) => {
    const response = await apiClient.patch(`/api/booking/requests/${id}/assign-resources`, payload);
    return response.data;
  },
  
  requestNOCClarification: async (id: string, payload: any) => {
    const response = await apiClient.patch(`/api/booking/requests/${id}/clarification`, payload);
    return response.data;
  },

  updateIngestAction: async (id: string, payload: any) => {
    const response = await apiClient.patch(`/api/booking/requests/${id}/ingest-action`, payload);
    return response.data;
  },

  acknowledgeRequest: async (id: string, payload: any) => {
    const response = await apiClient.patch(`/api/booking/requests/${id}/acknowledge`, payload);
    return response.data;
  },

  updateRequest: async (id: string, updates: Partial<WorkflowRequest>): Promise<WorkflowRequest> => {
    const response = await apiClient.put(`/api/booking/requests/${id}`, updates);
    return response.data;
  },

  updateDownloadLink: async (requestId: string,linkId: number,data: UpdateDownloadLinkDto): Promise<WorkflowRequest> => {
    const res = await apiClient.patch(`/api/booking/requests/${requestId}/download-links/${linkId}`,data);
    return res.data;
  },

  /** PATCH bulk: marks given links (or all) as Done; returns updated booking request. */
  markAllDownloadLinksDone: async (
    requestId: string,
    body: { all?: boolean; linkIds?: number[] } = { all: true }
  ): Promise<WorkflowRequest> => {
    const res = await apiClient.patch(
      `/api/booking/requests/${requestId}/download-links/mark-all-done`,
      body
    );
    const data = res.data as
      | (WorkflowRequest & { request?: WorkflowRequest })
      | { request: WorkflowRequest }
      | undefined;
    if (data && typeof data === 'object' && 'request' in data && data.request) {
      const inner = data.request;
      return { ...inner, id: inner.id != null ? String(inner.id) : inner.id } as WorkflowRequest;
    }
    const flat = data as WorkflowRequest | undefined;
    if (flat?.id != null && typeof flat.id !== 'string') {
      return { ...flat, id: String(flat.id) } as WorkflowRequest;
    }
    return flat as WorkflowRequest;
  },

  getTransitions: async (requestId: string): Promise<WorkflowTransition[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockTransitions.filter(trans => trans.requestId === String(requestId));
  },

  getResources: async (requestId: string): Promise<ResourceAssignment[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockResources.filter(res => res.requestId === requestId);
  },

  updateRequestStatus: async (
    requestId: string,
    newStatus: WorkflowStatus,
    data: any,
    userRole: UserRole
  ): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 400));

    const index = mockRequests.findIndex(req => req.id === requestId);
    if (index === -1) throw new Error('Request not found');

    const oldStatus = mockRequests[index].status;
    mockRequests[index].status = newStatus;
    mockRequests[index].updatedAt = new Date().toISOString();

    let comment = '';
    if (data.clarificationMessage) {
      comment = `Clarification requested: ${data.clarificationMessage}`;
    } else if (data.assignedResources) {
      comment = `Resources assigned: ${data.assignedResources}`;

      const resource: ResourceAssignment = {
        id: `res-${Date.now()}`,
        requestId: requestId,
        resourceType: 'Equipment',
        resourceName: data.assignedResources,
        assignedBy: `${userRole} Team`,
        assignedAt: new Date().toISOString()
      };
      mockResources.push(resource);
    } else if (data.reason) {
      comment = `Marked as Not Done: ${data.reason}`;
    } else if (newStatus === 'Completed') {
      comment = 'Request completed successfully';
    } else if (newStatus === 'Resources Added') {
      comment = 'NOC updates saved and resources added';
    } else {
      comment = `Status updated to ${newStatus}`;
    }

    const transition: WorkflowTransition = {
      id: `trans-${Date.now()}`,
      requestId: requestId,
      fromStatus: oldStatus,
      toStatus: newStatus,
      changedBy: `${userRole} Team`,
      changedAt: new Date().toISOString(),
      comment: comment
    };
    mockTransitions.push(transition);
  }
};


