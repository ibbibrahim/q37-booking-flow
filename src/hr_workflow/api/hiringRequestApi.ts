import apiClient from '@/utils/apiClient';
import type {
  HiringRequestDetail,
  HiringRequestSummary,
  HiringRequestEvent,
  HiringRequestLinkInfo,
  InterviewCriteriaScore,
  InterviewRecommendation,
} from '../types/hiringRequest';

const API_BASE = '/api/hr/hiring-requests';

export const hiringRequestApi = {
  getAll: async (): Promise<HiringRequestSummary[]> => {
    const { data } = await apiClient.get(API_BASE);
    return data;
  },

  getById: async (id: number): Promise<HiringRequestDetail> => {
    const { data } = await apiClient.get(`${API_BASE}/${id}`);
    return data;
  },

  getAudit: async (id: number): Promise<HiringRequestEvent[]> => {
    const { data } = await apiClient.get(`${API_BASE}/${id}/audit`);
    return data;
  },

  create: async (dto: { departmentId: number; positionTitle: string; candidateName: string; candidateEmail?: string }): Promise<HiringRequestDetail> => {
    const { data } = await apiClient.post(API_BASE, dto);
    return data;
  },

  generateLink: async (id: number): Promise<HiringRequestDetail> => {
    const { data } = await apiClient.post(`${API_BASE}/${id}/generate-link`);
    return data;
  },

  submitInterview: async (
    id: number,
    payload: {
      interviewDate: string;
      interviewerName: string;
      criteriaScores: InterviewCriteriaScore[];
      finalValuePercent: number;
      recommendation: InterviewRecommendation;
      comments?: string;
    },
    pdf: File
  ): Promise<HiringRequestDetail> => {
    const formData = new FormData();
    formData.append('payload', JSON.stringify(payload));
    formData.append('pdf', pdf);
    const { data } = await apiClient.post(`${API_BASE}/${id}/interview`, formData, {
      headers: { 'Content-Type': undefined },
    });
    return data;
  },

  // The GM's decision happens outside the system — HRAdmin records it
  // directly once the interview is submitted, with the actual date GM
  // approved on.
  gmApprove: async (id: number, approvalDate: string): Promise<HiringRequestDetail> => {
    const { data } = await apiClient.post(`${API_BASE}/${id}/gm-approve`, { approvalDate });
    return data;
  },

  gmReject: async (id: number, reason: string): Promise<HiringRequestDetail> => {
    const { data } = await apiClient.post(`${API_BASE}/${id}/gm-reject`, { reason });
    return data;
  },

  recordCeoApproval: async (id: number, referenceNo: string, approvalAt: string): Promise<HiringRequestDetail> => {
    const { data } = await apiClient.post(`${API_BASE}/${id}/ceo-approval`, { referenceNo, approvalAt });
    return data;
  },

  setStartingDate: async (
    id: number,
    startingDate: string,
    jobTitleEn: string,
    jobTitleAr: string | undefined,
    pdf: File
  ): Promise<HiringRequestDetail> => {
    const formData = new FormData();
    formData.append('startingDate', startingDate);
    formData.append('jobTitleEn', jobTitleEn);
    if (jobTitleAr) formData.append('jobTitleAr', jobTitleAr);
    formData.append('pdf', pdf);
    const { data } = await apiClient.post(`${API_BASE}/${id}/starting-date`, formData, {
      headers: { 'Content-Type': undefined },
    });
    return data;
  },

  // Starting Date signature chain — Coordinator records whether the
  // candidate showed up (capturing their in-person signature if so), then
  // the Department Head signs the matching section.
  recordEmployeeStartSignature: async (
    id: number, pdf: Blob, signedByName: string, verificationId: string,
    signatureImage?: { bytes: Uint8Array; type: 'png' | 'jpeg' }
  ): Promise<HiringRequestDetail> => {
    const formData = new FormData();
    formData.append('pdf', pdf, 'starting-date.pdf');
    formData.append('signedByName', signedByName);
    formData.append('verificationId', verificationId);
    if (signatureImage) {
      formData.append('signatureImage', new Blob([new Uint8Array(signatureImage.bytes)], { type: `image/${signatureImage.type}` }), `sig.${signatureImage.type}`);
    }
    const { data } = await apiClient.post(`${API_BASE}/${id}/employee-start-sign`, formData, { headers: { 'Content-Type': undefined } });
    return data;
  },

  recordNotStarting: async (id: number): Promise<HiringRequestDetail> => {
    const { data } = await apiClient.post(`${API_BASE}/${id}/not-starting`);
    return data;
  },

  managerStartSign: async (
    id: number, pdf: Blob, signedByName: string, verificationId: string,
    signatureImage?: { bytes: Uint8Array; type: 'png' | 'jpeg' }
  ): Promise<HiringRequestDetail> => {
    const formData = new FormData();
    formData.append('pdf', pdf, 'starting-date.pdf');
    formData.append('signedByName', signedByName);
    formData.append('verificationId', verificationId);
    if (signatureImage) {
      formData.append('signatureImage', new Blob([new Uint8Array(signatureImage.bytes)], { type: `image/${signatureImage.type}` }), `sig.${signatureImage.type}`);
    }
    const { data } = await apiClient.post(`${API_BASE}/${id}/manager-start-sign`, formData, { headers: { 'Content-Type': undefined } });
    return data;
  },

  getPdfBytes: async (id: number): Promise<ArrayBuffer> => {
    const { data } = await apiClient.get(`${API_BASE}/${id}/starting-date-pdf`, { responseType: 'arraybuffer' });
    return data;
  },

  convert: async (id: number): Promise<HiringRequestDetail> => {
    const { data } = await apiClient.post(`${API_BASE}/${id}/convert`);
    return data;
  },

  markNotStarted: async (id: number, reason: string): Promise<HiringRequestDetail> => {
    const { data } = await apiClient.post(`${API_BASE}/${id}/not-started`, { reason });
    return data;
  },
};

// ---- Public, unauthenticated ----

export const hiringRequestPublicApi = {
  getLinkInfo: async (token: string): Promise<HiringRequestLinkInfo> => {
    const { data } = await apiClient.get(`${API_BASE}/public/${token}`, { skipAuthRedirect: true });
    return data;
  },
};
