import axios from 'axios';
import apiClient from '@/utils/apiClient';
import type {
  HrDepartment,
  HrSection,
  HrEmployee,
  HrEmployeeQuery,
  HrEmployeeListResult,
  CreateHrEmployeeDto,
  UpdateHrEmployeeStatusDto,
  ConvertToPermanentDto,
  HrQidScanResult,
  HrContract,
  HrContractSignerRole,
  HrSignatureMethod,
  HrContractAuditSummary,
  HrContractIntegrity,
  HrContractUploadVerification,
  HrDepartmentHead,
  CreateHrDepartmentHeadDto,
  HrDepartmentHeadSignature,
  HrFinalSignatorySignature,
} from '../types/hrApi';

const API_BASE = '/api/hr';

function isNotFoundError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

export const hrApi = {
  // Departments
  getDepartments: async (): Promise<HrDepartment[]> => {
    const { data } = await apiClient.get(`${API_BASE}/departments`);
    return data;
  },

  updateDepartment: async (id: number, dto: { nameEn: string; nameAr: string; sortOrder: number }): Promise<HrDepartment> => {
    const { data } = await apiClient.put(`${API_BASE}/departments/${id}`, dto);
    return data;
  },

  // Sections
  getSections: async (departmentId?: number): Promise<HrSection[]> => {
    const { data } = await apiClient.get(`${API_BASE}/sections`, {
      params: departmentId ? { departmentId } : undefined,
    });
    return data;
  },

  // Employees
  searchEmployees: async (query: HrEmployeeQuery): Promise<HrEmployeeListResult> => {
    const { data } = await apiClient.get(`${API_BASE}/employees`, { params: query });
    return data;
  },

  getEmployee: async (id: number): Promise<HrEmployee> => {
    const { data } = await apiClient.get(`${API_BASE}/employees/${id}`);
    return data;
  },

  createEmployee: async (dto: CreateHrEmployeeDto): Promise<HrEmployee> => {
    const { data } = await apiClient.post(`${API_BASE}/employees`, dto);
    return data;
  },

  updateEmployee: async (id: number, dto: CreateHrEmployeeDto): Promise<HrEmployee> => {
    const { data } = await apiClient.put(`${API_BASE}/employees/${id}`, dto);
    return data;
  },

  updateEmployeeStatus: async (id: number, dto: UpdateHrEmployeeStatusDto): Promise<HrEmployee> => {
    const { data } = await apiClient.patch(`${API_BASE}/employees/${id}/status`, dto);
    return data;
  },

  convertToPermanent: async (id: number, dto: ConvertToPermanentDto): Promise<HrEmployee> => {
    const { data } = await apiClient.patch(`${API_BASE}/employees/${id}/convert-to-permanent`, dto);
    return data;
  },

  // Documents — uploaded via the backend (multipart -> Blob Storage), not signed URLs.
  // apiClient defaults Content-Type to application/json for every request, so it must be
  // explicitly cleared here — otherwise the browser can't attach the multipart boundary
  // and the backend rejects the request with 415 Unsupported Media Type.
  uploadProfilePicture: async (id: number, file: File): Promise<HrEmployee> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post(`${API_BASE}/employees/${id}/profile-picture`, formData, {
      headers: { 'Content-Type': undefined },
    });
    return data;
  },

  uploadContractAttachment: async (id: number, file: File): Promise<HrEmployee> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post(`${API_BASE}/employees/${id}/contracts`, formData, {
      headers: { 'Content-Type': undefined },
    });
    return data;
  },

  deleteContractAttachment: async (id: number, attachmentId: number): Promise<void> => {
    await apiClient.delete(`${API_BASE}/employees/${id}/contracts/${attachmentId}`);
  },

  // OCR scan of a single QID photo (front and back stacked in one image, matching the
  // Qatar app export) — returns extracted fields to pre-fill the form. Doesn't save
  // anything; the caller decides what to apply.
  scanQid: async (image: File): Promise<HrQidScanResult> => {
    const formData = new FormData();
    formData.append('image', image);
    const { data } = await apiClient.post(`${API_BASE}/employees/qid-scan`, formData, {
      headers: { 'Content-Type': undefined },
    });
    return data;
  },

  // Contract signing — the PDF itself is generated/stamped client-side
  // (pdf-lib); the backend just stores the working copy and the audit trail.
  createContract: async (employeeId: number, pdf: Blob): Promise<HrContract> => {
    const formData = new FormData();
    formData.append('employeeId', String(employeeId));
    formData.append('pdf', pdf, 'contract.pdf');
    const { data } = await apiClient.post(`${API_BASE}/contracts`, formData, {
      headers: { 'Content-Type': undefined },
    });
    return data;
  },

  // Coordinator's "Save" while filling the remaining fields directly on the
  // document, before it's sent to the employee for signature.
  updateContract: async (contractId: number, pdf: Blob): Promise<HrContract> => {
    const formData = new FormData();
    formData.append('pdf', pdf, 'contract.pdf');
    const { data } = await apiClient.put(`${API_BASE}/contracts/${contractId}`, formData, {
      headers: { 'Content-Type': undefined },
    });
    return data;
  },

  // The current working copy's raw bytes, proxied through our own API
  // rather than fetching the blob URL directly from the browser.
  getContractPdfBytes: async (contractId: number): Promise<ArrayBuffer> => {
    const { data } = await apiClient.get(`${API_BASE}/contracts/${contractId}/pdf`, {
      responseType: 'arraybuffer',
    });
    return data;
  },

  // The most recent contract for an employee, if any — used to resume an
  // in-progress renewal instead of starting a duplicate.
  getLatestContractForEmployee: async (employeeId: number): Promise<HrContract | null> => {
    try {
      const { data } = await apiClient.get(`${API_BASE}/contracts/by-employee/${employeeId}`);
      return data;
    } catch (error) {
      if (isNotFoundError(error)) return null;
      throw error;
    }
  },

  // One latest contract per employee (only for those that have one) — for
  // the Contract Renewal list's status column.
  getLatestContractsForEmployees: async (employeeIds: number[]): Promise<HrContract[]> => {
    if (employeeIds.length === 0) return [];
    const { data } = await apiClient.get(`${API_BASE}/contracts/by-employees`, {
      params: { ids: employeeIds.join(',') },
    });
    return data;
  },

  // "Discard & Restart" — deletes a still-in-progress draft entirely so the
  // coordinator can start clean. Backend rejects this once the employee has
  // signed (nothing left to discard at that point, it's part of the record).
  discardContract: async (contractId: number): Promise<void> => {
    await apiClient.delete(`${API_BASE}/contracts/${contractId}`);
  },

  signContract: async (
    contractId: number,
    pdf: Blob,
    role: HrContractSignerRole,
    signedByName: string,
    signatureMethod: HrSignatureMethod,
    verificationId: string,
    signedByEmail?: string | null,
    signatureImage?: { bytes: Uint8Array; type: 'png' | 'jpeg' } | null
  ): Promise<HrContract> => {
    const formData = new FormData();
    formData.append('pdf', pdf, 'contract-signed.pdf');
    formData.append('role', role);
    formData.append('signedByName', signedByName);
    if (signedByEmail) formData.append('signedByEmail', signedByEmail);
    formData.append('signatureMethod', signatureMethod);
    formData.append('verificationId', verificationId);
    if (signatureImage) {
      const blob = new Blob([new Uint8Array(signatureImage.bytes)], { type: `image/${signatureImage.type}` });
      formData.append('signatureImage', blob, `signature.${signatureImage.type === 'jpeg' ? 'jpg' : 'png'}`);
    }
    const { data } = await apiClient.post(`${API_BASE}/contracts/${contractId}/sign`, formData, {
      headers: { 'Content-Type': undefined },
    });
    return data;
  },

  // Full lifecycle timeline (Created, Saved, Viewed, Signed, Completed,
  // Discarded) — what an in-app audit-trail view and the Certificate of
  // Completion are both built from.
  getContractAuditSummary: async (contractId: number): Promise<HrContractAuditSummary> => {
    const { data } = await apiClient.get(`${API_BASE}/contracts/${contractId}/audit`);
    return data;
  },

  // Recomputes the stored PDF's SHA-256 and compares it against the hash
  // recorded at the last write — the actual tamper check.
  verifyContractIntegrity: async (contractId: number): Promise<HrContractIntegrity> => {
    const { data } = await apiClient.get(`${API_BASE}/contracts/${contractId}/integrity`);
    return data;
  },

  // Testing/validation utility — hashes a user-uploaded PDF and compares it
  // against this contract's trusted hash on record, to prove (or disprove)
  // that the uploaded file is byte-for-byte what the system produced.
  verifyUploadedContractPdf: async (contractId: number, pdf: File): Promise<HrContractUploadVerification> => {
    const formData = new FormData();
    formData.append('pdf', pdf, pdf.name);
    const { data } = await apiClient.post(`${API_BASE}/contracts/${contractId}/verify-upload`, formData, {
      headers: { 'Content-Type': undefined },
    });
    return data;
  },

  // Stores a client-generated Certificate of Completion PDF against a
  // Completed contract (as a separate document, not appended to it).
  saveContractCertificate: async (contractId: number, pdf: Blob): Promise<HrContract> => {
    const formData = new FormData();
    formData.append('pdf', pdf, 'certificate-of-completion.pdf');
    const { data } = await apiClient.post(`${API_BASE}/contracts/${contractId}/certificate`, formData, {
      headers: { 'Content-Type': undefined },
    });
    return data;
  },

  getContractCertificateBytes: async (contractId: number): Promise<ArrayBuffer> => {
    const { data } = await apiClient.get(`${API_BASE}/contracts/${contractId}/certificate`, {
      responseType: 'arraybuffer',
    });
    return data;
  },

  // Department Heads — which department a user leads, scoping their
  // approval queue, and their saved signature (captured once, reused for
  // every contract they approve).
  getMyDepartmentHead: async (): Promise<HrDepartmentHead | null> => {
    try {
      const { data } = await apiClient.get(`${API_BASE}/department-heads/me`);
      return data;
    } catch (error) {
      if (isNotFoundError(error)) return null;
      throw error;
    }
  },

  getDepartmentHeads: async (): Promise<HrDepartmentHead[]> => {
    const { data } = await apiClient.get(`${API_BASE}/department-heads`);
    return data;
  },

  createDepartmentHead: async (dto: CreateHrDepartmentHeadDto): Promise<HrDepartmentHead> => {
    const { data } = await apiClient.post(`${API_BASE}/department-heads`, dto);
    return data;
  },

  deleteDepartmentHead: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_BASE}/department-heads/${id}`);
  },

  getMyDepartmentHeadSignature: async (): Promise<HrDepartmentHeadSignature | null> => {
    try {
      const { data } = await apiClient.get(`${API_BASE}/department-heads/signature/me`);
      return data;
    } catch (error) {
      if (isNotFoundError(error)) return null;
      throw error;
    }
  },

  saveMyDepartmentHeadSignature: async (image: Blob, signatureMethod: HrSignatureMethod): Promise<HrDepartmentHeadSignature> => {
    const formData = new FormData();
    formData.append('image', image, 'signature.png');
    formData.append('signatureMethod', signatureMethod);
    const { data } = await apiClient.post(`${API_BASE}/department-heads/signature`, formData, {
      headers: { 'Content-Type': undefined },
    });
    return data;
  },

  // GM (Final Signatory) — same signature capture/reuse pattern as
  // Department Head, no department mapping (role membership alone scopes
  // the approval queue).
  getMyFinalSignatorySignature: async (): Promise<HrFinalSignatorySignature | null> => {
    try {
      const { data } = await apiClient.get(`${API_BASE}/final-signatories/signature/me`);
      return data;
    } catch (error) {
      if (isNotFoundError(error)) return null;
      throw error;
    }
  },

  saveMyFinalSignatorySignature: async (image: Blob, signatureMethod: HrSignatureMethod): Promise<HrFinalSignatorySignature> => {
    const formData = new FormData();
    formData.append('image', image, 'signature.png');
    formData.append('signatureMethod', signatureMethod);
    const { data } = await apiClient.post(`${API_BASE}/final-signatories/signature`, formData, {
      headers: { 'Content-Type': undefined },
    });
    return data;
  },
};
