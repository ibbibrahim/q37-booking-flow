import { isAxiosError } from 'axios';
import apiClient from '@/utils/apiClient';
import type {
  ChecklistSubmission,
  ChecklistSubmissionSummary,
  ChecklistTemplate,
  ChecklistType,
  SaveChecklistSubmission,
} from '@/bit_workflow/types/checklist';

const BASE = '/api/bit/checklists';

export const bitChecklistApi = {
  /** Active templates for a checklist type, ordered by displayOrder. */
  getTemplates: async (type: ChecklistType): Promise<ChecklistTemplate[]> => {
    const response = await apiClient.get<ChecklistTemplate[]>(`${BASE}/templates`, { params: { type } });
    return response.data;
  },

  /** Submission history for a type, newest period first. */
  getSubmissionSummaries: async (type: ChecklistType): Promise<ChecklistSubmissionSummary[]> => {
    const response = await apiClient.get<ChecklistSubmissionSummary[]>(`${BASE}/submissions`, { params: { type } });
    return response.data;
  },

  /** Current-period submission, or null when not started yet (204). */
  getCurrentSubmission: async (type: ChecklistType): Promise<ChecklistSubmission | null> => {
    const response = await apiClient.get<ChecklistSubmission>(`${BASE}/submissions/current`, { params: { type } });
    return response.status === 204 ? null : response.data;
  },

  getSubmissionById: async (id: number): Promise<ChecklistSubmission> => {
    const response = await apiClient.get<ChecklistSubmission>(`${BASE}/submissions/${id}`);
    return response.data;
  },

  /**
   * Save progress (submit: false) or final submit (submit: true) for the current period.
   * The server stamps completionTime/completedBy — always replace local state with the response.
   */
  saveCurrentSubmission: async (
    type: ChecklistType,
    body: SaveChecklistSubmission
  ): Promise<ChecklistSubmission> => {
    const response = await apiClient.put<ChecklistSubmission>(`${BASE}/submissions/current`, body, {
      params: { type },
    });
    return response.data;
  },
};

/** Extracts the API's { message } from a 400/403/409 response, with a fallback. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;
    if (error.response?.status === 403) return 'You do not have access to BIT checklists.';
  }
  return fallback;
}

/** True when the server refused the write because the submission is already completed. */
export function isAlreadyCompletedError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 409;
}
