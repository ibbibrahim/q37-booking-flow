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
  VideoWallPresentation: 'Video Wall Presentation',
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

// Lead time (hours) the doc asks requesters to respect before AirDate/AirTime — enforced as a
// soft warning only, never blocks submission.
export const CREATIVE_LEAD_TIME_HOURS: Partial<Record<CreativeRequestType, number>> = {
  NewsHeadline: 1,
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

// --- Per-request-type dynamic field shapes (serialized to/from TypeSpecificData JSON) ---

// Image/file fields carry the uploaded file's name and size alongside its URL (captured
// straight from the browser's File object) so anyone opening the request later — Graphics
// Team, Social Media — can see exactly what was uploaded without re-fetching it. Files are
// stored as raw bytes in Azure Blob Storage with no re-encoding, so what's shown here is
// byte-for-byte identical to what download produces.

export interface CreativeSection {
  title: string;
  backgroundImage?: UploadedFileRef;
  icons?: UploadedFileRef[];
}

export interface SocialMediaHeadlineData {
  requestKind: 'EventPackage' | 'DailyRequest';
  // Event Package fields
  packageItems?: ('Headlines' | 'Carrousel' | 'Photo Gallery' | 'Real Templates')[];
  eventLogo?: UploadedFileRef;
  eventName?: string;
  // Daily Request fields
  dailyEventName?: string;
  selectType?: 'Carrousel' | 'Headline';
  // Carrousel
  sections?: CreativeSection[];
  platform?: 'QBC' | 'QTV37' | 'QBC & QTV37';
  // Headline
  title?: string;
  backgroundImage?: UploadedFileRef;
  // Response
  driveLink?: string;
}

export interface NewsHeadlineData {
  screen: 'Full (S2+S3+S4)' | 'S2 only' | string;
  headlineText: string;
  referenceImage?: UploadedFileRef;
}

export interface ProgramVideoWallTopic {
  type: 'FullScreenGraphic' | 'VizTemplateGraphic';
  text?: string;
  image?: UploadedFileRef;
  vizTemplateName?: string;
}

export interface ProgramVideoWallData {
  screen: string;
  topics: ProgramVideoWallTopic[];
}

export interface VideoWallPresentationData {
  title: string;
  screen: string;
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
  images: UploadedFileRef[];
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
}

export interface CreativeRequest extends CreativeRequestListItem {
  typeSpecificData: string | null;
  updatedAt: string;
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
