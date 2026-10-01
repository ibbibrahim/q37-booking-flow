import apiClient from '../../utils/apiClient';
import { dateToQatarIso } from './dtlTime';
import type { DtlBooking, DtlBookingReport, DtlGuest, DtlProgram } from '../types/dtl';

interface DtlListResult<T> {
  items: T[];
  page: number;
  perPage: number;
  totalItems: number;
}

interface RawListResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

function toListResult<T>(data: RawListResult<T>): DtlListResult<T> {
  return { items: data.items, page: data.page, perPage: data.pageSize, totalItems: data.total };
}

export type DtlBookingSortBy = 'time' | 'id';

export async function listDtlBookings(opts: {
  page: number;
  perPage: number;
  search?: string;
  status?: string;
  sortBy?: DtlBookingSortBy;
  sortDescending?: boolean;
}): Promise<DtlListResult<DtlBooking>> {
  const { data } = await apiClient.get<RawListResult<DtlBooking>>('/api/dtl/bookings', {
    params: {
      page: opts.page,
      pageSize: opts.perPage,
      search: opts.search?.trim() || undefined,
      status: opts.status || undefined,
      sortBy: opts.sortBy || 'time',
      sortDescending: opts.sortDescending ?? true,
    },
  });
  return toListResult(data);
}

export async function getDtlBooking(id: string): Promise<DtlBooking> {
  const { data } = await apiClient.get<DtlBooking>(`/api/dtl/bookings/${id}`);
  return data;
}

export async function updateDtlBookingLink(id: string, link: string): Promise<DtlBooking> {
  const { data } = await apiClient.patch<DtlBooking>(`/api/dtl/bookings/${id}/link`, { link });
  return data;
}

export async function updateDtlBookingStatus(
  id: string,
  status: string,
  logText?: string,
): Promise<DtlBooking> {
  const { data } = await apiClient.patch<DtlBooking>(`/api/dtl/bookings/${id}/status`, { status, logText });
  return data;
}

export async function getDtlBookingProgramNames(): Promise<string[]> {
  const { data } = await apiClient.get<string[]>('/api/dtl/bookings/meta/programs');
  return data;
}

export async function listDtlPrograms(): Promise<DtlProgram[]> {
  const { data } = await apiClient.get<DtlProgram[]>('/api/dtl/programs');
  return data;
}

export type NewDtlProgramInput = {
  name: string;
  price: number;
  durationMinutes?: number;
};

export async function createDtlProgram(data: NewDtlProgramInput): Promise<DtlProgram> {
  const { data: created } = await apiClient.post<DtlProgram>('/api/dtl/programs', data);
  return created;
}

export async function updateDtlProgram(id: number, data: NewDtlProgramInput): Promise<DtlProgram> {
  const { data: updated } = await apiClient.put<DtlProgram>(`/api/dtl/programs/${id}`, data);
  return updated;
}

export async function deleteDtlProgram(id: number): Promise<void> {
  await apiClient.delete(`/api/dtl/programs/${id}`);
}

export async function getDtlBookingReport(opts: {
  from?: Date;
  to?: Date;
  statuses?: string[];
}): Promise<DtlBookingReport> {
  const params = new URLSearchParams();
  if (opts.from) params.set('from', dateToQatarIso(opts.from));
  if (opts.to) params.set('to', dateToQatarIso(opts.to));
  for (const status of opts.statuses ?? []) params.append('statuses', status);

  const { data } = await apiClient.get<DtlBookingReport>(
    `/api/dtl/guests/booking-report?${params.toString()}`,
  );
  return data;
}

export async function appendDtlBookingLog(id: string, text: string): Promise<DtlBooking> {
  const { data } = await apiClient.patch<DtlBooking>(`/api/dtl/bookings/${id}/log`, { text });
  return data;
}

export async function sendDtlBookingLinkEmail(id: string): Promise<DtlBooking> {
  const { data } = await apiClient.post<DtlBooking>(`/api/dtl/bookings/${id}/send-link-email`);
  return data;
}

export async function listDtlGuests(opts: {
  page: number;
  perPage: number;
  search?: string;
}): Promise<DtlListResult<DtlGuest>> {
  const { data } = await apiClient.get<RawListResult<DtlGuest>>('/api/dtl/guests', {
    params: { page: opts.page, pageSize: opts.perPage, search: opts.search?.trim() || undefined },
  });
  return toListResult(data);
}

export interface DtlGuestBookingCount {
  guestId: number;
  name: string;
  email: string | null;
  phone: string | null;
  passportLink: string | null;
  ibanLink: string | null;
  imageLink: string | null;
  bookingCount: number;
}

export async function getDtlGuestBookingCounts(opts: {
  from?: Date;
  to?: Date;
  statuses?: string[];
  program?: string;
}): Promise<DtlGuestBookingCount[]> {
  const params = new URLSearchParams();
  if (opts.from) params.set('from', dateToQatarIso(opts.from));
  if (opts.to) params.set('to', dateToQatarIso(opts.to));
  if (opts.program?.trim()) params.set('program', opts.program.trim());
  for (const status of opts.statuses ?? []) params.append('statuses', status);

  const { data } = await apiClient.get<DtlGuestBookingCount[]>(
    `/api/dtl/guests/booking-counts?${params.toString()}`,
  );
  return data;
}

export async function getDtlGuest(id: number): Promise<DtlGuest> {
  const { data } = await apiClient.get<DtlGuest>(`/api/dtl/guests/${id}`);
  return data;
}

export async function searchDtlGuests(query: string, limit = 8): Promise<DtlGuest[]> {
  const q = query.trim();
  if (!q) return [];
  const { data } = await apiClient.get<RawListResult<DtlGuest>>('/api/dtl/guests', {
    params: { search: q, page: 1, pageSize: limit },
  });
  return data.items;
}

export type NewDtlGuestInput = {
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  company?: string;
  country?: string;
  address?: string;
  passportLink?: string;
  ibanLink?: string;
  imageLink?: string;
};

export type DtlGuestUploadKind = 'image' | 'passport' | 'iban';

export async function uploadDtlGuestDocument(file: File, kind: DtlGuestUploadKind): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<{ url: string }>(
    `/api/dtl/guests/upload?kind=${kind}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data.url;
}

export async function createDtlGuest(data: NewDtlGuestInput): Promise<DtlGuest> {
  const { data: created } = await apiClient.post<DtlGuest>('/api/dtl/guests', data);
  return created;
}

export async function updateDtlGuest(id: number, data: NewDtlGuestInput): Promise<DtlGuest> {
  const { data: updated } = await apiClient.put<DtlGuest>(`/api/dtl/guests/${id}`, data);
  return updated;
}

/** Soft-deletes the guest (backend sets is_deleted = true; the row/history is kept). */
export async function deleteDtlGuest(id: number): Promise<void> {
  await apiClient.delete(`/api/dtl/guests/${id}`);
}

export type NewDtlBookingInput = {
  guestId: number;
  programId: number;
  location?: string;
  time?: string;
  durationMinutes?: number;
  status?: string;
};

export type UpdateDtlBookingInput = {
  guestId: number;
  programId: number;
  location?: string;
  time?: string;
  durationMinutes?: number;
};

export async function updateDtlBooking(id: string, data: UpdateDtlBookingInput): Promise<DtlBooking> {
  const { data: updated } = await apiClient.put<DtlBooking>(`/api/dtl/bookings/${id}`, data);
  return updated;
}

export async function createDtlBooking(
  data: NewDtlBookingInput,
  createdByRoleLabel: string,
): Promise<DtlBooking> {
  const { data: created } = await apiClient.post<DtlBooking>('/api/dtl/bookings', data);
  try {
    return await appendDtlBookingLog(created.id, `${createdByRoleLabel || 'Unknown'}: Created the booking`);
  } catch {
    // Booking itself succeeded; the log entry is a nicety, not worth failing the create over.
    return created;
  }
}
