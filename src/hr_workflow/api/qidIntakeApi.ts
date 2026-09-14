import apiClient from '@/utils/apiClient';
import type { HrQidScanResult, HrQidIntakeSubmission } from '../types/hrApi';

// apiClient's response interceptor reads this custom flag (see
// utils/apiClient.ts) but AxiosRequestConfig doesn't declare it — this
// augmentation makes the flag itself type-check without an `any` cast at
// every call site that opts out of the global 401-redirect behavior.
declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuthRedirect?: boolean;
  }
}

const API_BASE = '/api/hr/qid-intake';

export interface QidIntakeSubmitPayload {
  name: string;
  image: File;
  qid?: string | null;
  fullNameEn?: string | null;
  fullNameAr?: string | null;
  dob?: string | null;
  qidExpiry?: string | null;
  nationality?: string | null;
  occupation?: string | null;
  passportNumber?: string | null;
  passportExpiry?: string | null;
  employer?: string | null;
  residencyType?: string | null;
}

// Backs the unauthenticated QID intake page — every call opts out of the
// global 401 redirect-to-login interceptor (skipAuthRedirect), since a
// visitor here has no session and no way to log in; the backend endpoints
// are anonymous by design, so a 401 should never happen, but if it ever did,
// bouncing them to a login screen they can't use would be worse than just
// showing an error.
export const qidIntakeApi = {
  scanQid: async (image: File): Promise<HrQidScanResult> => {
    const formData = new FormData();
    formData.append('image', image);
    const { data } = await apiClient.post(`${API_BASE}/scan`, formData, {
      headers: { 'Content-Type': undefined },
      skipAuthRedirect: true,
    });
    return data;
  },

  submit: async (payload: QidIntakeSubmitPayload): Promise<HrQidIntakeSubmission> => {
    const formData = new FormData();
    formData.append('name', payload.name);
    formData.append('image', payload.image);
    const optionalFields: Array<[string, string | null | undefined]> = [
      ['qid', payload.qid],
      ['fullNameEn', payload.fullNameEn],
      ['fullNameAr', payload.fullNameAr],
      ['dob', payload.dob],
      ['qidExpiry', payload.qidExpiry],
      ['nationality', payload.nationality],
      ['occupation', payload.occupation],
      ['passportNumber', payload.passportNumber],
      ['passportExpiry', payload.passportExpiry],
      ['employer', payload.employer],
      ['residencyType', payload.residencyType],
    ];
    for (const [key, value] of optionalFields) {
      if (value) formData.append(key, value);
    }

    const { data } = await apiClient.post(`${API_BASE}/submit`, formData, {
      headers: { 'Content-Type': undefined },
      skipAuthRedirect: true,
    });
    return data;
  },
};
