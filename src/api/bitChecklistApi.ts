import { isAxiosError } from 'axios';
import apiClient from '@/utils/apiClient';
import type {
  ChecklistSubmission,
  ChecklistSubmissionSummary,
  ChecklistTeam,
  ChecklistTemplate,
  ChecklistType,
  SaveChecklistSubmission,
  SaveChecklistTemplate,
} from '@/bit_workflow/types/checklist';

const BASE = '/api/bit/checklists';

export const bitChecklistApi = {
  /** Active templates for a checklist type, ordered by displayOrder. */
  getTemplates: async (team: ChecklistTeam, type: ChecklistType): Promise<ChecklistTemplate[]> => {
    const response = await apiClient.get<ChecklistTemplate[]>(`${BASE}/templates`, { params: { team, type } });
    return response.data;
  },

  createTemplate: async (team: ChecklistTeam, body: SaveChecklistTemplate): Promise<ChecklistTemplate> => {
    const response = await apiClient.post<ChecklistTemplate>(`${BASE}/templates`, body, { params: { team } });
    return response.data;
  },

  updateTemplate: async (team: ChecklistTeam, id: number, body: SaveChecklistTemplate): Promise<ChecklistTemplate> => {
    const response = await apiClient.put<ChecklistTemplate>(`${BASE}/templates/${id}`, body, { params: { team } });
    return response.data;
  },

  /** Removes the template from current and future checklists; past submissions keep their record. */
  deleteTemplate: async (team: ChecklistTeam, id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/templates/${id}`, { params: { team } });
  },

  /** Persists the full order for a type — `ids` is every template id of that type in the new order. */
  reorderTemplates: async (team: ChecklistTeam, type: ChecklistType, ids: number[]): Promise<void> => {
    await apiClient.put(`${BASE}/templates/reorder`, { ids }, { params: { team, type } });
  },

  /** Submission history for a type, newest period first. */
  getSubmissionSummaries: async (team: ChecklistTeam, type: ChecklistType): Promise<ChecklistSubmissionSummary[]> => {
    const response = await apiClient.get<ChecklistSubmissionSummary[]>(`${BASE}/submissions`, { params: { team, type } });
    return response.data;
  },

  /** Current-period submission, or null when not started yet (204). */
  getCurrentSubmission: async (team: ChecklistTeam, type: ChecklistType): Promise<ChecklistSubmission | null> => {
    const response = await apiClient.get<ChecklistSubmission>(`${BASE}/submissions/current`, { params: { team, type } });
    return response.status === 204 ? null : response.data;
  },

  getSubmissionById: async (team: ChecklistTeam, id: number): Promise<ChecklistSubmission> => {
    const response = await apiClient.get<ChecklistSubmission>(`${BASE}/submissions/${id}`, { params: { team } });
    return response.data;
  },

  /**
   * Save progress (submit: false) or final submit (submit: true) for the current period.
   * The server stamps completionTime/completedBy — always replace local state with the response.
   */
  saveCurrentSubmission: async (
    team: ChecklistTeam,
    type: ChecklistType,
    body: SaveChecklistSubmission
  ): Promise<ChecklistSubmission> => {
    const response = await apiClient.put<ChecklistSubmission>(`${BASE}/submissions/current`, body, {
      params: { team, type },
    });
    return response.data;
  },
};

/** Extracts the API's { message } from a 400/403/409 response, with a fallback. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;
    if (error.response?.status === 403) return 'You do not have access to these Engineering checklists.';
  }
  return fallback;
}

/** True when the server refused the write because the submission is already completed. */
export function isAlreadyCompletedError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 409;
}
