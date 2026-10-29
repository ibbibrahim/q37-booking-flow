import type { UploadedFileRef } from '@/components/ui/multi-file-upload-field';
export type { UploadedFileRef } from '@/components/ui/multi-file-upload-field';

// News/Programs Producers are not a separate role in this system — they're identified by
// the existing 'Booking' role, which is reused here rather than creating a new one.
export type CreativeRole =
  | 'SocialMedia'
  | 'Booking'
  | 'GraphicsTeam'
  | 'MotionGraphicsTeam'
  | 'Admin'
  | '';

export const CREATIVE_REQUEST_TYPE = {
  SocialMediaHeadline: 'SocialMediaHeadline',
  NewsHeadline: 'NewsHeadline',
  ProgramVideoWall: 'ProgramVideoWall',
  VideoWallPresentation: 'VideoWallPresentation',
  Filler: 'Filler',
  LowerThird: 'LowerThird',
  SpecialRequest: 'SpecialRequest',
} as const;

export type CreativeRequestType = (typeof CREATIVE_REQUEST_TYPE)[keyof typeof CREATIVE_REQUEST_TYPE];

export const CREATIVE_REQUEST_TYPE_LABEL: Record<CreativeRequestType, string> = {
  SocialMediaHeadline: 'Social Media Headline',
  NewsHeadline: 'News Headline',
  ProgramVideoWall: 'Program Video Wall',
  VideoWallPresentation: 'Presentation',
  Filler: 'Filler',
  LowerThird: 'Lower Third',
  SpecialRequest: 'Special Request',
};

// Request types the Graphics Team fulfills vs. the Motion Graphics Team.
export const GRAPHICS_TEAM_REQUEST_TYPES: CreativeRequestType[] = [
  CREATIVE_REQUEST_TYPE.SocialMediaHeadline,
  CREATIVE_REQUEST_TYPE.NewsHeadline,
  CREATIVE_REQUEST_TYPE.ProgramVideoWall,
  CREATIVE_REQUEST_TYPE.VideoWallPresentation,
];
export const MOTION_GRAPHICS_TEAM_REQUEST_TYPES: CreativeRequestType[] = [
  CREATIVE_REQUEST_TYPE.Filler,
  CREATIVE_REQUEST_TYPE.LowerThird,
  CREATIVE_REQUEST_TYPE.SpecialRequest,
];

// Whose deliverable is a name in Vizrt's own Image Library (we generate the name, Graphics
// Team uploads the file there themselves — we never store it). Mirrors the backend's
// CreativeRequestTypes.ImageLibraryTypes.
export const IMAGE_LIBRARY_REQUEST_TYPES: CreativeRequestType[] = [
  CREATIVE_REQUEST_TYPE.NewsHeadline,
  CREATIVE_REQUEST_TYPE.ProgramVideoWall,
  CREATIVE_REQUEST_TYPE.VideoWallPresentation,
];

// Lead time (hours) the doc asks requesters to respect before AirDate/AirTime — enforced as a
// soft warning only, never blocks submission.
export const CREATIVE_LEAD_TIME_HOURS: Partial<Record<CreativeRequestType, number>> = {
  NewsHeadline: 0.5,
  ProgramVideoWall: 1,
  VideoWallPresentation: 6,
};

export const CREATIVE_REQUEST_STATUS = {
  Submitted: 'Submitted',
  Completed: 'Completed',
  Approved: 'Approved',
  NeedsRevision: 'NeedsRevision',
} as const;

export const CREATIVE_TERMINAL_STATUSES: string[] = [CREATIVE_REQUEST_STATUS.Approved];

export const CREATIVE_PRIORITY = {
  Normal: 'Normal',
  Urgent: 'Urgent',
} as const;

export type CreativePriority = (typeof CREATIVE_PRIORITY)[keyof typeof CREATIVE_PRIORITY];

// Takes the user's full set of roles (a user can hold more than one) and unions the
// permissions each grants — mirrors dtlPermissionsFor's rationale in dtl_workflow/types/dtl.ts.
export function creativePermissionsFor(roles: string[]) {
  const has = (r: string) => roles.includes(r);
  const isAdmin = has('Admin');
  const isSocialMedia = has('SocialMedia');
  // News/Programs Producers are the existing 'Booking' role, not a separate one.
  const isNewsProducer = has('Booking');
  const isGraphicsTeam = has('GraphicsTeam');
  const isMotionGraphicsTeam = has('MotionGraphicsTeam');
  const hasAnyRole = isAdmin || isSocialMedia || isNewsProducer || isGraphicsTeam || isMotionGraphicsTeam;

  return {
    isAdmin,
    hasAnyRole,
    canListRequests: hasAnyRole,
    // Doc's access rule, both directions: Social Media may only submit Social Media Headline
    // requests, and Booking/News-Programs Producers may submit every type EXCEPT that one.
    canCreateSocialMediaHeadline: isSocialMedia || isAdmin,
    canCreateProducerRequest: isNewsProducer || isAdmin,
    canFulfillGraphicsRequest: isGraphicsTeam || isAdmin,
    canFulfillMotionGraphicsRequest: isMotionGraphicsTeam || isAdmin,
    canApproveSocialMedia: isSocialMedia || isAdmin,
    canChat: hasAnyRole,
    canManageReference: isAdmin,
  };
}

export function canCreateRequestType(roles: string[], requestType: CreativeRequestType): boolean {
  const perms = creativePermissionsFor(roles);
  if (requestType === CREATIVE_REQUEST_TYPE.SocialMediaHeadline) {
    return perms.canCreateSocialMediaHeadline;
  }
  return perms.canCreateProducerRequest;
}

export function canFulfill(roles: string[], requestType: CreativeRequestType): boolean {
  const perms = creativePermissionsFor(roles);
  return GRAPHICS_TEAM_REQUEST_TYPES.includes(requestType)
    ? perms.canFulfillGraphicsRequest
    : perms.canFulfillMotionGraphicsRequest;
}

// Everything News/Programs Producers (the 'Booking' role) may submit — every type except
// Social Media Headline, which is SocialMedia's alone. Mirrors the backend's
// CreativeRequestTypes.BookingCreatableTypes.
const BOOKING_CREATABLE_TYPES: CreativeRequestType[] = [
  CREATIVE_REQUEST_TYPE.NewsHeadline,
  CREATIVE_REQUEST_TYPE.ProgramVideoWall,
  CREATIVE_REQUEST_TYPE.VideoWallPresentation,
  CREATIVE_REQUEST_TYPE.Filler,
  CREATIVE_REQUEST_TYPE.LowerThird,
  CREATIVE_REQUEST_TYPE.SpecialRequest,
];

// Which request types the caller's role(s) may even see in the list — mirrors the backend's
// AllowedRequestTypesForCaller scoping, so the "Type" filter never offers an option that
// would just come back empty (or worse, imply they could see a request that isn't theirs).
export function visibleRequestTypesFor(roles: string[]): CreativeRequestType[] {
  if (roles.includes('Admin')) return Object.values(CREATIVE_REQUEST_TYPE);

  const visible = new Set<CreativeRequestType>();
  if (roles.includes('SocialMedia')) visible.add(CREATIVE_REQUEST_TYPE.SocialMediaHeadline);
  if (roles.includes('Booking')) BOOKING_CREATABLE_TYPES.forEach((t) => visible.add(t));
  if (roles.includes('GraphicsTeam')) GRAPHICS_TEAM_REQUEST_TYPES.forEach((t) => visible.add(t));
  if (roles.includes('MotionGraphicsTeam')) MOTION_GRAPHICS_TEAM_REQUEST_TYPES.forEach((t) => visible.add(t));
  return Array.from(visible);
}

// --- Per-request-type dynamic field shapes (serialized to/from TypeSpecificData JSON) ---

// Image/file fields carry the uploaded file's name and size alongside its URL (captured
// straight from the browser's File object) so anyone opening the request later — Graphics
// Team, Social Media — can see exactly what was uploaded without re-fetching it. Files are
// stored as raw bytes in Azure Blob Storage with no re-encoding, so what's shown here is
// byte-for-byte identical to what download produces.

export interface CreativeSection {
  content: string;
  backgroundImage?: UploadedFileRef;
  icons?: UploadedFileRef[];
}

export interface SocialMediaHeadlineData {
  requestKind: 'EventPackage' | 'DailyRequest';
  // Event Package fields
  packageItems?: ('Headlines' | 'Carrousel' | 'Photo Gallery' | 'Real Templates')[];
  eventLogos?: UploadedFileRef[];
  eventName?: string;
  // Daily Request fields
  dailyEventName?: string;
  selectType?: 'Carrousel' | 'Headline' | 'Reel Cover';
  // Carrousel
  sections?: CreativeSection[];
  platform?: 'QBC' | 'QTV37' | 'QBC & QTV37';
  // Headline / Reel Cover (same fields, shared by both)
  content?: string;
  backgroundImage?: UploadedFileRef;
  // Response
  driveLink?: string;
}

export interface NewsHeadlineData {
  screen: string;
  headlineText: string;
  referenceImage?: UploadedFileRef;
  logos?: UploadedFileRef[];
  flags?: UploadedFileRef[];
}

export interface ProgramVideoWallSlide {
  content: string;
  image?: UploadedFileRef;
}

export interface ProgramVideoWallData {
  screen: string;
  slides: ProgramVideoWallSlide[];
}

export interface VideoWallPresentationData {
  screen: string;
  // Same Content/Image Reference shape as Program Video Wall's slides.
  slides: ProgramVideoWallSlide[];
}

export interface FillerSection {
  title: string;
  description: string;
}

export interface FillerData {
  sections: FillerSection[];
  responsePath?: string;
}

export interface LowerThirdSection {
  personName: string;
  personJobTitle: string;
}

export interface LowerThirdData {
  sections: LowerThirdSection[];
  responsePath?: string;
}

export interface SpecialRequestData {
  // Doc's "Image Link(s)" field: pasted URLs (e.g. to a shared drive image), not uploaded
  // files — so this is a list of link strings, not UploadedFileRef.
  imageLinks: string[];
  description: string;
  responsePath?: string;
}

// --- API-facing shapes ---

export interface CreativeRequestAttachment {
  id: number;
  requestId: number;
  fileUrl: string;
  fileName: string;
  contentType: string | null;
  fileSizeBytes: number;
  imageCode: string | null;
  uploadedBy: number | null;
  uploadedByName: string | null;
  createdAt: string;
}

export interface CreativeRequestListItem {
  id: number;
  title: string;
  requestType: CreativeRequestType;
  status: string;
  priority: string;
  airDate: string;
  airTime: string;
  program: string | null;
  createdBy: number | null;
  createdByName: string | null;
  createdAt: string;
  claimedBy: number | null;
  claimedByName: string | null;
}

// One name Graphics Team generated for Vizrt's own Image Library — a request can need several
// (one per actual image produced), each told apart by its own free-text differentiator.
export interface CreativeImageLibraryName {
  id: number;
  code: string;
  freeText: string;
  createdBy: number | null;
  createdByName: string | null;
  createdAt: string;
}

export interface CreativeRequest extends CreativeRequestListItem {
  typeSpecificData: string | null;
  updatedAt: string;
  claimedAt: string | null;
  imageLibraryNames: CreativeImageLibraryName[];
  attachments: CreativeRequestAttachment[];
}

export interface CreativeRequestTransition {
  id: number;
  requestId: number;
  fromStatus: string;
  toStatus: string;
  comment: string | null;
  changedBy: number | null;
  changedByName: string | null;
  changedAt: string;
}

export interface CreativeCommentAttachment {
  id: number;
  fileUrl: string;
  fileName: string;
  contentType: string | null;
  fileSizeBytes: number;
}

export interface CreativeComment {
  id: number;
  requestId: number;
  authorUserId: number;
  authorName: string | null;
  body: string | null;
  createdAt: string;
  attachments: CreativeCommentAttachment[];
}

export interface CreativeProgram {
  id: number;
  name: string;
}

export interface CreativeScreen {
  id: number;
  name: string;
  imageUrl: string | null;
  // Where the screen sits in the studio — shown under its photo in the screen picker.
  description: string | null;
  // Which request forms offer this screen (set per screen on the Reference Lists page).
  useForNewsHeadline: boolean;
  useForVideoWall: boolean; // Program Video Wall + Video Wall Presentation
}
