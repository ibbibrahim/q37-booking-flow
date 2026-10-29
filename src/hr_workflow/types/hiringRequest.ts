export type HiringRequestStatus =
  | 'Requested'
  | 'LinkGenerated'
  | 'ProfileSubmitted'
  | 'InterviewSubmitted'
  | 'AwaitingGmApproval'
  | 'Rejected'
  | 'AwaitingCeoApproval'
  | 'CeoApproved'
  | 'StartingDateSet'
  | 'Converted'
  | 'NotStarted';

export type InterviewRecommendation = 'RecommendForHire' | 'PracticalTest' | 'NotAMatch' | 'DecisionNotYetMade';

export interface InterviewCriteriaScore {
  criteria: string;
  score: number;
}

export interface HiringRequestSummary {
  id: number;
  /** "HIRE-{year}-{0000001}" — stable reference, never resets per year. */
  applicationRef: string | null;
  status: HiringRequestStatus;
  departmentId: number;
  departmentNameEn: string | null;
  positionTitle: string;
  candidateName: string;
  candidateEmail: string | null;
  requestedAt: string;
  startingDate: string | null;
  contractId: number | null;
  startIntent: 'Started' | 'NotStarted' | null;
  managerStartSignedAt: string | null;
  /** Department Head's review/sign-off on the interview evaluation — a side
   * track within InterviewSubmitted, informational only (doesn't gate GM
   * approval). */
  managerReviewedAt: string | null;
}

export interface HiringRequestDetail extends HiringRequestSummary {
  linkToken: string | null;
  linkGeneratedAt: string | null;
  linkExpiresAt: string | null;
  freelanceProfileSubmissionId: number | null;

  interviewDate: string | null;
  interviewerName: string | null;
  interviewCriteriaScores: InterviewCriteriaScore[] | null;
  interviewFinalValuePercent: number | null;
  interviewRecommendation: InterviewRecommendation | null;
  interviewComments: string | null;
  interviewPdfUrl: string | null;
  managerReviewedByName: string | null;

  gmDecidedAt: string | null;
  gmApprovalDate: string | null;
  gmRejectReason: string | null;

  ceoApprovalReferenceNo: string | null;
  ceoApprovalAt: string | null;
  ceoApprovalLetterUrl: string | null;
  /** The freelancer's monthly reward (salary) agreed as part of the CEO's approval. */
  monthlyReward: number | null;

  startingDatePdfUrl: string | null;
  startIntent: 'Started' | 'NotStarted' | null;
  employeeStartSignedByName: string | null;
  employeeStartSignedAt: string | null;
  managerStartSignedByName: string | null;
  managerStartSignedAt: string | null;

  convertedEmployeeId: number | null;
  convertedAt: string | null;
  notStartedReason: string | null;
  notStartedAt: string | null;
}

export interface HiringRequestEvent {
  id: number;
  eventType: string;
  actorName: string | null;
  metadata: string | null;
  createdAt: string;
}

export interface HiringRequestLinkInfo {
  candidateName: string;
  positionTitle: string;
  departmentNameEn: string | null;
  alreadySubmitted: boolean;
}

export const INTERVIEW_CRITERIA = [
  'Prior Work Experience',
  'Educational Background',
  'Technical Qualifications/Experience',
  'body language & Technical Qualifications/Experience',
  'Attitude and Enthusiasm',
  'Creativity',
  'Problem Solving',
  'Candidate Interest',
  'Presentation',
  'Stress tolerance',
  'Time management',
  'Takes initiative',
] as const;

export const HIRING_REQUEST_STATUS_LABELS: Record<HiringRequestStatus, string> = {
  Requested: 'Requested',
  LinkGenerated: 'Link Generated',
  ProfileSubmitted: 'Profile Submitted',
  InterviewSubmitted: 'Interview Submitted',
  AwaitingGmApproval: 'Awaiting GM Approval',
  Rejected: 'Rejected',
  AwaitingCeoApproval: 'Awaiting CEO Approval',
  CeoApproved: 'CEO Approved',
  StartingDateSet: 'Starting Date Set',
  Converted: 'Converted to Employee',
  NotStarted: 'Did Not Start',
};
