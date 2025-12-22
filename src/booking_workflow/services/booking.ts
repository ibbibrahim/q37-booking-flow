import apiClient from "@/utils/apiClient";
import type { WorkflowRequest, DownloadLinkDto } from "../types/workflow";

export interface UpdateDownloadLinkDto {
  ingestStatus?: string;
  ingestNotes?: string;
}

export const BookingApi = {
  updateDownloadLink: async (
    requestId: string,
    linkId: number,
    data: UpdateDownloadLinkDto
  ): Promise<WorkflowRequest> => {
    const res = await apiClient.patch(
      `/booking-requests/${requestId}/download-links/${linkId}`,
      data
    );
    return res.data;
  },
};
