import type { StudioBooking, CreateBookingDTO, UpdateBookingDTO } from '../types/booking';

const STORAGE_KEY = 'studio_bookings';
const NEXT_ID_KEY = 'studio_bookings_next_id';

const defaultBookings: StudioBooking[] = [
  {
    id: 1,
    code: 'SN-001',
    title: 'Morning News Bulletin',
    studioType: 'Studio News',
    startDateTime: '2025-01-15T08:00:00',
    endDateTime: '2025-01-15T09:30:00',
    createdBy: 'Sarah Johnson',
    notes: 'Daily morning news broadcast'
  },
  {
    id: 2,
    code: 'SN-002',
    title: 'Dubai Financial District Live',
    studioType: 'Studio News',
    startDateTime: '2025-01-15T09:00:00',
    endDateTime: '2025-01-15T10:45:00',
    createdBy: 'Ahmed Al-Mansoori',
    notes: 'Live coverage from Dubai Financial District'
  },
  {
    id: 3,
    code: 'SN-003',
    title: 'Weather Update',
    studioType: 'Studio News',
    startDateTime: '2025-01-15T09:45:00',
    endDateTime: '2025-01-15T10:15:00',
    createdBy: 'Maria Garcia',
  },
  {
    id: 4,
    code: 'SN-004',
    title: 'Stock Market Opening Bell',
    studioType: 'Studio News',
    startDateTime: '2025-01-15T13:00:00',
    endDateTime: '2025-01-15T14:30:00',
    createdBy: 'Robert Chen',
    notes: 'Market opening coverage'
  },
  {
    id: 5,
    code: 'SN-005',
    title: 'Live Business Summit Coverage',
    studioType: 'Studio News',
    startDateTime: '2025-01-15T14:00:00',
    endDateTime: '2025-01-15T15:30:00',
    createdBy: 'Jennifer Lee',
  },
  {
    id: 6,
    code: 'SN-006',
    title: 'Breaking News - Economic Report',
    studioType: 'Studio News',
    startDateTime: '2025-01-15T14:45:00',
    endDateTime: '2025-01-15T16:00:00',
    createdBy: 'David Wilson',
  },
  {
    id: 7,
    code: 'SN-007',
    title: 'Conference Coverage - Tech Innovation',
    studioType: 'Studio News',
    startDateTime: '2025-01-15T15:30:00',
    endDateTime: '2025-01-15T17:00:00',
    createdBy: 'Lisa Anderson',
  },
  {
    id: 8,
    code: 'SP-001',
    title: 'Expert Panel Discussion',
    studioType: 'Studio Program',
    startDateTime: '2025-01-15T10:00:00',
    endDateTime: '2025-01-15T11:30:00',
    createdBy: 'Michael Brown',
    notes: 'Weekly expert roundtable'
  },
  {
    id: 9,
    code: 'SP-002',
    title: 'Financial Expert Interview',
    studioType: 'Studio Program',
    startDateTime: '2025-01-15T10:30:00',
    endDateTime: '2025-01-15T12:00:00',
    createdBy: 'Anna Petrova',
  },
  {
    id: 10,
    code: 'SP-003',
    title: 'Startup Founder Spotlight',
    studioType: 'Studio Program',
    startDateTime: '2025-01-15T11:00:00',
    endDateTime: '2025-01-15T12:30:00',
    createdBy: 'Omar Hassan',
    notes: 'Interview with startup founders'
  },
  {
    id: 11,
    code: 'SP-004',
    title: 'Midday Market Report',
    studioType: 'Studio Program',
    startDateTime: '2025-01-15T12:00:00',
    endDateTime: '2025-01-15T13:30:00',
    createdBy: 'Sophie Martin',
  },
  {
    id: 12,
    code: 'SP-005',
    title: 'Tech Talk Show',
    studioType: 'Studio Program',
    startDateTime: '2025-01-15T13:30:00',
    endDateTime: '2025-01-15T15:00:00',
    createdBy: 'James Taylor',
  },
  {
    id: 13,
    code: 'SP-006',
    title: 'Afternoon Talk Show',
    studioType: 'Studio Program',
    startDateTime: '2025-01-15T15:00:00',
    endDateTime: '2025-01-15T16:30:00',
    createdBy: 'Emma Thompson',
    notes: 'Daily afternoon talk show'
  },
  {
    id: 14,
    code: 'SP-007',
    title: 'Sports Analysis',
    studioType: 'Studio Program',
    startDateTime: '2025-01-15T16:00:00',
    endDateTime: '2025-01-15T17:30:00',
    createdBy: 'Carlos Rodriguez',
  },
];

const loadFromLocalStorage = (): StudioBooking[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading bookings from localStorage:', error);
  }
  return defaultBookings;
};

const loadNextId = (): number => {
  try {
    const stored = localStorage.getItem(NEXT_ID_KEY);
    if (stored) {
      return parseInt(stored, 10);
    }
  } catch (error) {
    console.error('Error loading next ID from localStorage:', error);
  }
  return 15;
};

const saveToLocalStorage = (data: StudioBooking[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving bookings to localStorage:', error);
  }
};

const saveNextId = (id: number): void => {
  try {
    localStorage.setItem(NEXT_ID_KEY, id.toString());
  } catch (error) {
    console.error('Error saving next ID to localStorage:', error);
  }
};

let bookings: StudioBooking[] = loadFromLocalStorage();
let nextId = loadNextId();

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingBooking?: StudioBooking;
}

export const bookingService = {
  getAll: (): StudioBooking[] => {
    return [...bookings];
  },

  getById: (id: number): StudioBooking | undefined => {
    return bookings.find(b => b.id === id);
  },

  checkConflict: (
    studioType: string,
    startDateTime: string,
    endDateTime: string,
    excludeId?: number
  ): ConflictCheckResult => {
    const newStart = new Date(startDateTime);
    const newEnd = new Date(endDateTime);

    const conflicting = bookings.find(booking => {
      if (booking.studioType !== studioType) return false;
      if (excludeId && booking.id === excludeId) return false;

      const existingStart = new Date(booking.startDateTime);
      const existingEnd = new Date(booking.endDateTime);

      const hasOverlap = newStart < existingEnd && newEnd > existingStart;

      return hasOverlap;
    });

    return {
      hasConflict: !!conflicting,
      conflictingBooking: conflicting
    };
  },

  create: (dto: CreateBookingDTO): { success: boolean; booking?: StudioBooking; error?: string } => {
    const startDate = new Date(dto.startDateTime);
    const endDate = new Date(dto.endDateTime);

    if (endDate <= startDate) {
      return { success: false, error: 'End time must be after start time' };
    }

    const conflictCheck = bookingService.checkConflict(
      dto.studioType,
      dto.startDateTime,
      dto.endDateTime
    );

    if (conflictCheck.hasConflict) {
      return {
        success: false,
        error: `Time slot conflicts with existing booking "${conflictCheck.conflictingBooking?.title}" (${conflictCheck.conflictingBooking?.code})`
      };
    }

    const prefix = dto.studioType === 'Studio News' ? 'SN' : 'SP';
    const count = bookings.filter(b => b.studioType === dto.studioType).length + 1;
    const code = `${prefix}-${count.toString().padStart(3, '0')}`;

    const newBooking: StudioBooking = {
      id: nextId++,
      code,
      createdBy: 'Current User',
      ...dto
    };

    bookings.push(newBooking);
    saveToLocalStorage(bookings);
    saveNextId(nextId);
    return { success: true, booking: newBooking };
  },

  update: (id: number, dto: UpdateBookingDTO): { success: boolean; booking?: StudioBooking; error?: string } => {
    const index = bookings.findIndex(b => b.id === id);
    if (index === -1) {
      return { success: false, error: 'Booking not found' };
    }

    const existing = bookings[index];
    const updated = { ...existing, ...dto };

    const startDate = new Date(updated.startDateTime);
    const endDate = new Date(updated.endDateTime);

    if (endDate <= startDate) {
      return { success: false, error: 'End time must be after start time' };
    }

    const conflictCheck = bookingService.checkConflict(
      updated.studioType,
      updated.startDateTime,
      updated.endDateTime,
      id
    );

    if (conflictCheck.hasConflict) {
      return {
        success: false,
        error: `Time slot conflicts with existing booking "${conflictCheck.conflictingBooking?.title}" (${conflictCheck.conflictingBooking?.code})`
      };
    }

    bookings[index] = updated;
    saveToLocalStorage(bookings);
    return { success: true, booking: updated };
  },

  remove: (id: number): { success: boolean; error?: string } => {
    const index = bookings.findIndex(b => b.id === id);
    if (index === -1) {
      return { success: false, error: 'Booking not found' };
    }

    bookings.splice(index, 1);
    saveToLocalStorage(bookings);
    return { success: true };
  }
};
