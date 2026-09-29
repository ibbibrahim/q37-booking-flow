import apiClient from '@/utils/apiClient';
import type { LeaveRequestDetail, LeaveRequestSummary, LeaveRequestEvent, LeaveRequestFieldsPayload } from '../types/leaveRequest';

const API_BASE = '/api/hr/leave-requests';

export const leaveRequestApi = {
  getAll: async (): Promise<LeaveRequestSummary[]> => {
    const { data } = await apiClient.get(API_BASE);
    return data;
  },

  getById: async (id: number): Promise<LeaveRequestDetail> => {
    const { data } = await apiClient.get(`${API_BASE}/${id}`);
    return data;
  },

  getAudit: async (id: number): Promise<LeaveRequestEvent[]> => {
    const { data } = await apiClient.get(`${API_BASE}/${id}/audit`);
    return data;
  },

  getPdfBytes: async (id: number): Promise<ArrayBuffer> => {
    const { data } = await apiClient.get(`${API_BASE}/${id}/pdf`, { responseType: 'arraybuffer' });
    return data;
  },

  create: async (employeeId: number, pdf: Blob): Promise<LeaveRequestDetail> => {
    const formData = new FormData();
    formData.append('employeeId', String(employeeId));
    formData.append('pdf', pdf, 'leave-suspension.pdf');
    const { data } = await apiClient.post(API_BASE, formData, { headers: { 'Content-Type': undefined } });
    return data;
  },

  update: async (id: number, pdf: Blob, fields: LeaveRequestFieldsPayload): Promise<LeaveRequestDetail> => {
    const formData = new FormData();
    formData.append('payload', JSON.stringify(fields));
    formData.append('pdf', pdf, 'leave-suspension.pdf');
    const { data } = await apiClient.put(`${API_BASE}/${id}`, formData, { headers: { 'Content-Type': undefined } });
    return data;
  },

  submit: async (id: number): Promise<LeaveRequestDetail> => {
    const { data } = await apiClient.post(`${API_BASE}/${id}/submit`);
    return data;
  },

  departmentHeadSign: async (
    id: number, pdf: Blob, signedByName: string, verificationId: string, signatureImage?: { bytes: Uint8Array; type: 'png' | 'jpeg' }
  ): Promise<LeaveRequestDetail> => {
    const formData = new FormData();
    formData.append('pdf', pdf, 'leave-suspension.pdf');
    formData.append('signedByName', signedByName);
    formData.append('verificationId', verificationId);
    if (signatureImage) {
      formData.append('signatureImage', new Blob([new Uint8Array(signatureImage.bytes)], { type: `image/${signatureImage.type}` }), `sig.${signatureImage.type}`);
    }
    const { data } = await apiClient.post(`${API_BASE}/${id}/dept-head-sign`, formData, { headers: { 'Content-Type': undefined } });
    return data;
  },

  freelancerAcknowledge: async (
    id: number, pdf: Blob, signedByName: string, verificationId: string, signatureImage?: { bytes: Uint8Array; type: 'png' | 'jpeg' }
  ): Promise<LeaveRequestDetail> => {
    const formData = new FormData();
    formData.append('pdf', pdf, 'leave-suspension.pdf');
    formData.append('signedByName', signedByName);
    formData.append('verificationId', verificationId);
    if (signatureImage) {
      formData.append('signatureImage', new Blob([new Uint8Array(signatureImage.bytes)], { type: `image/${signatureImage.type}` }), `sig.${signatureImage.type}`);
    }
    const { data } = await apiClient.post(`${API_BASE}/${id}/freelancer-acknowledge`, formData, { headers: { 'Content-Type': undefined } });
    return data;
  },
};
