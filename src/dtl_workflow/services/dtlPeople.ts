import {
  createDtlGuest,
  createDtlReporter,
  deleteDtlGuest,
  deleteDtlReporter,
  getDtlGuest,
  getDtlReporter,
  listDtlGuests,
  listDtlReporters,
  searchDtlGuests,
  searchDtlReporters,
  updateDtlGuest,
  updateDtlReporter,
} from './dtlApi';
import type { DtlBookingType } from '../types/dtl';

// Guests and reporters share one shape and one set of screens; this picks the right API and wording.
export const DTL_PEOPLE = {
  guest: {
    label: 'Guest',
    noun: 'guest',
    queryKey: 'dtl-guests',
    list: listDtlGuests,
    get: getDtlGuest,
    search: searchDtlGuests,
    create: createDtlGuest,
    update: updateDtlGuest,
    remove: deleteDtlGuest,
  },
  reporter: {
    label: 'Reporter',
    noun: 'reporter',
    queryKey: 'dtl-reporters',
    list: listDtlReporters,
    get: getDtlReporter,
    search: searchDtlReporters,
    create: createDtlReporter,
    update: updateDtlReporter,
    remove: deleteDtlReporter,
  },
} as const satisfies Record<DtlBookingType, unknown>;
