export interface BcmAdditionalTitle {
  titleType?: string;
  language?: string;
  value?: string;
}

export interface BcmItem {
  tvGuideTime: string;
  title: string;
  additionalTitle?: BcmAdditionalTitle[];
  duration: string;
  nominalDuration?: string;
  live?: boolean;
  repeat?: boolean;
  firstRun?: boolean;
  cast?: string;
  progCat?: { value?: string };
  genre?: { value?: string };
  premiereMode?: string;
  houseNumber?: string;
  setLocations?: string | null;
}

export interface BcmDay {
  date?: string;
  items?: BcmItem[];
}

export interface BcmChannel {
  day?: BcmDay[];
  items?: BcmItem[];
}

export type BcmResponse = BcmChannel[];

export interface Programme {
  id: string;
  startMinute: number;
  durationMinutes: number;
  startTime: string;
  title: string;
  arabicTitle?: string;
  tvGuideTitle?: string;
  cast?: string;
  category: string;
  genre: string;
  isLive: boolean;
  isRepeat: boolean;
  isFirstRun: boolean;
  premiereMode?: string;
  nominalDuration?: string;
  houseNumber?: string;
  location: string;
  raw: BcmItem;
}

export type ViewMode = 'daily' | 'weekly';

/** Qatar week: Sunday–Saturday (date-fns `weekStartsOn`: 0 = Sunday). */
export const WEEK_STARTS_ON = 0;

export interface CategoryStyle {
  bg: string;
  color: string;
  border: string;
  darkBg: string;
  darkColor: string;
}

export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  News:        { bg: '#E6F1FB', color: '#185FA5', border: '#378ADD', darkBg: '#0D2A44', darkColor: '#7BB8EC' },
  Business:    { bg: '#EEEDFE', color: '#534AB7', border: '#7F77DD', darkBg: '#1A183A', darkColor: '#A09AEE' },
  Documentary: { bg: '#FAEEDA', color: '#854F0B', border: '#BA7517', darkBg: '#2A1E08', darkColor: '#E8A940' },
  Sports:      { bg: '#FAECE7', color: '#993C1D', border: '#D85A30', darkBg: '#2A120A', darkColor: '#E8896A' },
  Live:        { bg: '#E1F5EE', color: '#0F6E56', border: '#1D9E75', darkBg: '#09251C', darkColor: '#3DC99B' },
};

export const DEFAULT_CATEGORY_STYLE: CategoryStyle = {
  bg: '#F5F5F5', color: '#555555', border: '#AAAAAA',
  darkBg: '#1A1A2A', darkColor: '#AAAACC',
};

export const CHANNEL_COL_WIDTH = 148;
export const PX_PER_MIN = 6;
export const TIMELINE_WIDTH = 24 * 60 * PX_PER_MIN;
export const CARD_HEIGHT = 96;
export const LANE_HEIGHT = 96;
export const RULER_HEIGHT = 36;
export const CARD_GAP = 4;
export const CARD_INSET_Y = 6;
/** Minimum rendered card width — below this, compact layout + hover detail */
export const MIN_CARD_WIDTH = 36;
export const NARROW_CARD_WIDTH = 90;
export const COMFORTABLE_CARD_WIDTH = 140;

/** Weekly grid (Excel-style) layout */
export const WEEKLY_PX_PER_MIN = 3.2;
export const WEEKLY_SLOT_MINUTES = 15;
export const WEEKLY_GRID_HEIGHT = 24 * 60 * WEEKLY_PX_PER_MIN;
export const WEEKLY_GMT_COL_WIDTH = 52;
export const WEEKLY_DOH_COL_WIDTH = 52;
export const WEEKLY_DAY_MIN_WIDTH = 148;
export const WEEKLY_TIME_HEADER_HEIGHT = 44;
export const WEEKLY_BLOCK_INSET = 1;
export const QATAR_UTC_OFFSET_HOURS = 3;
