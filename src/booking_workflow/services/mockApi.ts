import apiClient from '../../utils/apiClient';
import type { WorkflowRequest, WorkflowTransition, ResourceAssignment, WorkflowStatus, UserRole } from '../types/workflow';

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
  
  
  createRequest: async (
    request: Partial<WorkflowRequest>,
    status: WorkflowStatus
  ): Promise<WorkflowRequest> => {
    const response = await apiClient.post("/api/booking/requests", {
      ...request,
      status,
    });
    return response.data;
  },

  updateRequest: async (id: string, updates: Partial<WorkflowRequest>): Promise<WorkflowRequest> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const index = mockRequests.findIndex(req => req.id === id);
    if (index !== -1) {
      mockRequests[index] = {
        ...mockRequests[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      return mockRequests[index];
    }
    throw new Error('Request not found');
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



/* import type { WorkflowRequest, WorkflowTransition, ResourceAssignment, WorkflowStatus, UserRole } from '../types/workflow';

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
    requestId: 'req-001',
    fromStatus: 'Submitted',
    toStatus: 'With NOC',
    changedBy: 'NOC Team',
    changedAt: '2025-10-21T11:45:00',
    comment: 'Reviewed and assigned resources'
  },
  {
    id: 'trans-002',
    requestId: 'req-003',
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
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockRequests;
  },

  getRequestById: async (id: string): Promise<WorkflowRequest | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockRequests.find(req => req.id === id);
  },

  createRequest: async (request: Partial<WorkflowRequest>, status: WorkflowStatus): Promise<WorkflowRequest> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const newRequest: WorkflowRequest = {
      ...request,
      id: `req-${Date.now()}`,
      status: status,
      createdBy: 'Current User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as WorkflowRequest;
    mockRequests.push(newRequest);

    if (status === 'Submitted') {
      const transition: WorkflowTransition = {
        id: `trans-${Date.now()}`,
        requestId: newRequest.id,
        fromStatus: 'Draft',
        toStatus: 'Submitted',
        changedBy: 'Current User',
        changedAt: new Date().toISOString(),
        comment: 'Request submitted for processing'
      };
      mockTransitions.push(transition);
    }

    return newRequest;
  },

  updateRequest: async (id: string, updates: Partial<WorkflowRequest>): Promise<WorkflowRequest> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const index = mockRequests.findIndex(req => req.id === id);
    if (index !== -1) {
      mockRequests[index] = {
        ...mockRequests[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      return mockRequests[index];
    }
    throw new Error('Request not found');
  },

  getTransitions: async (requestId: string): Promise<WorkflowTransition[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockTransitions.filter(trans => trans.requestId === requestId);
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
*/