import apiClient from '@/utils/apiClient';
import type { HrQidScanResult } from '../types/hrApi';
import type {
  FreelanceProfileEducationDraft,
  FreelanceProfileExperienceDraft,
  FreelanceProfileCertificateDraft,
  FreelanceProfileFormFields,
  FreelanceProfileFormFiles,
  FreelanceProfileSubmission,
  FreelanceProfileSubmissionSummary,
  HrBankCertificateScanResult,
} from '../types/freelanceProfile';

// apiClient's response interceptor reads this custom flag (see
// utils/apiClient.ts) but AxiosRequestConfig doesn't declare it.
declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuthRedirect?: boolean;
  }
}

const API_BASE = '/api/hr/freelance-profile';

// ---- Public, unauthenticated side — used by FreelanceProfileFormPage ----

export const freelanceProfilePublicApi = {
  scanQid: async (image: File): Promise<HrQidScanResult> => {
    const formData = new FormData();
    formData.append('image', image);
    const { data } = await apiClient.post(`${API_BASE}/scan-qid`, formData, {
      headers: { 'Content-Type': undefined },
      skipAuthRedirect: true,
    });
    return data;
  },

  scanBankCertificate: async (image: File): Promise<HrBankCertificateScanResult> => {
    const formData = new FormData();
    formData.append('image', image);
    const { data } = await apiClient.post(`${API_BASE}/scan-bank-certificate`, formData, {
      headers: { 'Content-Type': undefined },
      skipAuthRedirect: true,
    });
    return data;
  },

  submit: async (
    fields: FreelanceProfileFormFields,
    files: FreelanceProfileFormFiles,
    education: FreelanceProfileEducationDraft[],
    experience: FreelanceProfileExperienceDraft[],
    certificates: FreelanceProfileCertificateDraft[],
    hiringRequestToken?: string
  ): Promise<FreelanceProfileSubmission> => {
    const formData = new FormData();

    const payload = {
      ...fields,
      phoneNumber: fields.phoneNumber ? `${fields.phoneCountryCode} ${fields.phoneNumber}`.trim() : '',
      hasRelativesAtQbc: fields.hasRelativesAtQbc === true,
      education: education.map((e, i) => ({
        qualificationLevel: e.qualificationLevel, major: e.major, attested: e.attested === true, fileKey: `education_${i}`,
      })),
      experience: experience.map((e, i) => ({ companyName: e.companyName, country: e.country, jobTitle: e.jobTitle, fileKey: `experience_${i}` })),
      certificates: certificates.map((c, i) => ({ title: c.title, fileKey: `certificates_${i}` })),
    };
    formData.append('payload', JSON.stringify(payload));
    if (hiringRequestToken) formData.append('hiringRequestToken', hiringRequestToken);

    const singleFiles: Array<[string, File | null]> = [
      ['qidImage', files.qidImage],
      ['photo', files.photo],
      ['cv', files.cv],
      ['employerNocLetter', files.employerNocLetter],
      ['employerEstablishmentCard', files.employerEstablishmentCard],
      ['bankCertificate', files.bankCertificate],
    ];
    for (const [key, file] of singleFiles) {
      if (file) formData.append(key, file);
    }

    education.forEach((e, i) => { if (e.file) formData.append(`education_${i}`, e.file); });
    experience.forEach((e, i) => { if (e.file) formData.append(`experience_${i}`, e.file); });
    certificates.forEach((c, i) => { if (c.file) formData.append(`certificates_${i}`, c.file); });

    const { data } = await apiClient.post(`${API_BASE}/submit`, formData, {
      headers: { 'Content-Type': undefined },
      skipAuthRedirect: true,
    });
    return data;
  },
};

// ---- Authenticated (HRAdmin) review side ----

export const freelanceProfileReviewApi = {
  getAll: async (): Promise<FreelanceProfileSubmissionSummary[]> => {
    const { data } = await apiClient.get(API_BASE);
    return data;
  },

  getById: async (id: number): Promise<FreelanceProfileSubmission> => {
    const { data } = await apiClient.get(`${API_BASE}/${id}`);
    return data;
  },

  approve: async (id: number, targetEmployeeId: number | null, reviewNotes: string | null): Promise<FreelanceProfileSubmission> => {
    const { data } = await apiClient.post(`${API_BASE}/${id}/approve`, {
      targetEmployeeId,
      reviewNotes,
    });
    return data;
  },

  reject: async (id: number, reason: string): Promise<FreelanceProfileSubmission> => {
    const { data } = await apiClient.post(`${API_BASE}/${id}/reject`, { reason });
    return data;
  },
};
