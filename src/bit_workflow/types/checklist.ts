export type ChecklistType = 'daily' | 'weekly' | 'monthly';

/** Vendor/brand of the application — drives the brand mark shown next to each item. */
export type ChecklistVendor = 'evs' | 'vizrt' | 'avid' | 'wires' | 'vantage' | 'glookast' | 'other';

export type ChecklistSubmissionStatus = 'in_progress' | 'completed';

export interface ChecklistTemplate {
  id: number;
  type: ChecklistType;
  sectionName: string;
  applicationName: string;
  ip: string;
  actionSteps: string[];
  displayOrder: number;
  vendor: ChecklistVendor;
}

export interface ChecklistItem {
  templateId: number;
  isCompleted: boolean;
  /** "HH:mm" (24h) or "" — stamped server-side, read-only */
  completionTime: string;
  remarks: string;
  /** Display name of who completed the step, "" when not completed — stamped server-side */
  completedBy: string;
}

export interface ChecklistSubmission {
  id: number;
  type: ChecklistType;
  /** "yyyy-MM-dd" — computed server-side, never sent on save */
  periodDate: string;
  /** Derived server-side: submitter when completed, otherwise last user who saved */
  engineerName: string;
  status: ChecklistSubmissionStatus;
  items: ChecklistItem[];
}

export interface ChecklistSubmissionSummary {
  id: number;
  type: ChecklistType;
  periodDate: string;
  engineerName: string;
  status: ChecklistSubmissionStatus;
  completedCount: number;
  totalCount: number;
  /** Distinct names of everyone who completed at least one step; [] when none. */
  engineers: string[];
}

/** PUT body for save progress / final submit — the only thing the client sends. */
export interface SaveChecklistSubmission {
  submit: boolean;
  items: {
    templateId: number;
    isCompleted: boolean;
    remarks: string;
  }[];
}
