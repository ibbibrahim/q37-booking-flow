export type StudioType = 'Studio News' | 'Studio Program';

export interface StudioBooking {
  id: number;
  code: string;
  title: string;
  studioType: StudioType;
  startDateTime: string;
  endDateTime: string;
  createdBy: string;
  notes?: string;
}

export interface CreateBookingDTO {
  title: string;
  studioType: StudioType;
  startDateTime: string;
  endDateTime: string;
  notes?: string;
}

export interface UpdateBookingDTO {
  title?: string;
  studioType?: StudioType;
  startDateTime?: string;
  endDateTime?: string;
  notes?: string;
}
