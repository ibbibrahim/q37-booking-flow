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

  forwardToGm: async (id: number): Promise<HiringRequestDetail> => {
    const { data } = await apiClient.post(`${API_BASE}/${id}/forward-to-gm`);
    return data;
  },

  gmApprove: async (id: number): Promise<HiringRequestDetail> => {
    const { data } = await apiClient.post(`${API_BASE}/${id}/gm-approve`);
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
