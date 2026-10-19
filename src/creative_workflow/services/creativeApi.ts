import apiClient from '../../utils/apiClient';
import type {
  CreativeComment,
  CreativeProgram,
  CreativeRequest,
  CreativeRequestListItem,
  CreativeRequestTransition,
  CreativeScreen,
} from '../types/creative';

export interface CreativeListResult<T> {
  items: T[];
  page: number;
  perPage: number;
  totalItems: number;
}

interface RawSearchResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

function toListResult<T>(data: RawSearchResult<T>): CreativeListResult<T> {
  return { items: data.items, page: data.page, perPage: data.pageSize, totalItems: data.total };
}

export async function listCreativeRequests(opts: {
  page: number;
  perPage: number;
  search?: string;
  status?: string;
  requestType?: string;
  mine?: boolean;
}): Promise<CreativeListResult<CreativeRequestListItem>> {
  const { data } = await apiClient.get<RawSearchResult<CreativeRequestListItem>>('/api/creative/requests', {
    params: {
      page: opts.page,
      pageSize: opts.perPage,
      search: opts.search?.trim() || undefined,
      status: opts.status || undefined,
      requestType: opts.requestType || undefined,
      mine: opts.mine || undefined,
    },
  });
  return toListResult(data);
}

export async function getCreativeRequest(id: number): Promise<CreativeRequest> {
  const { data } = await apiClient.get<CreativeRequest>(`/api/creative/requests/${id}`);
  return data;
}

export interface CreateCreativeRequestInput {
  requestType: string;
  title: string;
  airDate: string;
  airTime: string;
  priority: string;
  program?: string;
  typeSpecificData: string;
}

export async function createCreativeRequest(input: CreateCreativeRequestInput): Promise<CreativeRequest> {
  const { data } = await apiClient.post<CreativeRequest>('/api/creative/requests', input);
  return data;
}

export async function updateCreativeRequest(
  id: number,
  input: Omit<CreateCreativeRequestInput, 'requestType'>,
): Promise<CreativeRequest> {
  const { data } = await apiClient.put<CreativeRequest>(`/api/creative/requests/${id}`, input);
  return data;
}

export async function updateCreativeRequestStatus(
  id: number,
  newStatus: string,
  comment?: string,
): Promise<CreativeRequest> {
  const { data } = await apiClient.patch<CreativeRequest>(`/api/creative/requests/${id}/status`, {
    newStatus,
    comment,
  });
  return data;
}

// The response payload shape depends on RequestType: Social Media Headline wants a drive
// link, Filler/Lower Third/Special Request want a share-folder path, and News Headline/
// Program Video Wall/Video Wall Presentation need a confirmation that the image was uploaded
// to Vizrt's own Image Library under the generated imageLibraryCode (validated server-side).
export async function completeCreativeRequest(
  id: number,
  opts: { driveLink?: string; responsePath?: string; imageLibraryConfirmed?: boolean; comment?: string },
): Promise<CreativeRequest> {
  const { data } = await apiClient.patch<CreativeRequest>(`/api/creative/requests/${id}/complete`, opts);
  return data;
}

// "Claim & Start Working" — locks the request to the caller and, for Image-Library types,
// generates the Vizrt deliverable name (returned on the updated request as imageLibraryCode).
export async function claimCreativeRequest(id: number): Promise<CreativeRequest> {
  const { data } = await apiClient.patch<CreativeRequest>(`/api/creative/requests/${id}/claim`, {});
  return data;
}

export async function approveCreativeRequest(id: number, comment?: string): Promise<CreativeRequest> {
  const { data } = await apiClient.patch<CreativeRequest>(`/api/creative/requests/${id}/approve`, { comment });
  return data;
}

export async function unapproveCreativeRequest(id: number, comment: string): Promise<CreativeRequest> {
  const { data } = await apiClient.patch<CreativeRequest>(`/api/creative/requests/${id}/unapprove`, { comment });
  return data;
}

export async function getCreativeRequestTransitions(id: number): Promise<CreativeRequestTransition[]> {
  const { data } = await apiClient.get<CreativeRequestTransition[]>(`/api/creative/requests/${id}/transitions`);
  return data;
}

// Decoupled upload for create-form fields (event logo, background image, icons, reference
// image) before the request exists — mirrors uploadDtlGuestDocument.
export async function uploadCreativeFormFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<{ url: string }>('/api/creative/requests/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.url;
}

export interface CreativeAttachmentUploadResult {
  id: number;
  url: string;
  fileName: string;
  imageCode: string | null;
}

export async function uploadCreativeAttachment(
  requestId: number,
  file: File,
  ingestToImageLibrary = false,
): Promise<CreativeAttachmentUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<CreativeAttachmentUploadResult>(
    `/api/creative/requests/${requestId}/attachments?ingestToImageLibrary=${ingestToImageLibrary}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

export async function listCreativeComments(requestId: number): Promise<CreativeComment[]> {
  const { data } = await apiClient.get<CreativeComment[]>(`/api/creative/requests/${requestId}/comments`);
  return data;
}

export async function postCreativeComment(
  requestId: number,
  body: string | undefined,
  files: File[],
): Promise<CreativeComment> {
  const formData = new FormData();
  if (body) formData.append('Body', body);
  for (const file of files) formData.append('Files', file);

  const { data } = await apiClient.post<CreativeComment>(
    `/api/creative/requests/${requestId}/comments`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

export async function listCreativePrograms(): Promise<CreativeProgram[]> {
  const { data } = await apiClient.get<CreativeProgram[]>('/api/creative/programs');
  return data;
}

export async function createCreativeProgram(name: string): Promise<CreativeProgram> {
  const { data } = await apiClient.post<CreativeProgram>('/api/creative/programs', { name });
  return data;
}

export async function updateCreativeProgram(id: number, name: string): Promise<CreativeProgram> {
  const { data } = await apiClient.put<CreativeProgram>(`/api/creative/programs/${id}`, { name });
  return data;
}

export async function deleteCreativeProgram(id: number): Promise<void> {
  await apiClient.delete(`/api/creative/programs/${id}`);
}

export async function listCreativeScreens(): Promise<CreativeScreen[]> {
  const { data } = await apiClient.get<CreativeScreen[]>('/api/creative/screens');
  return data;
}

export interface CreativeScreenInput {
  name: string;
  imageUrl?: string | null;
  description?: string | null;
  useForNewsHeadline: boolean;
  useForVideoWall: boolean;
}

export async function createCreativeScreen(input: CreativeScreenInput): Promise<CreativeScreen> {
  const { data } = await apiClient.post<CreativeScreen>('/api/creative/screens', input);
  return data;
}

// Full replace on the server — always send every field, or the omitted ones get cleared.
export async function updateCreativeScreen(id: number, input: CreativeScreenInput): Promise<CreativeScreen> {
  const { data } = await apiClient.put<CreativeScreen>(`/api/creative/screens/${id}`, input);
  return data;
}

export async function deleteCreativeScreen(id: number): Promise<void> {
  await apiClient.delete(`/api/creative/screens/${id}`);
}
