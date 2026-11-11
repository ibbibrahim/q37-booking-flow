import { readFormDraft } from '@/hooks/useFormDraft';

const DRAFT_PREFIX = 'callsheet-workflow:draft';

/** Equipment row as autosaved (tempId and availability flags are regenerated on restore). */
export type CallsheetDraftEquipmentRow = {
  categoryId?: number;
  inventoryItemId?: number;
  quantity: number;
  category?: string;
  item?: string;
};

/** Snapshot of the new call sheet form that is autosaved locally. */
export type CallsheetDraftData = {
  formData: {
    department: string;
    title: string;
    startDateTime: string;
    returnDateTime: string;
    callTime: string;
    wrapTime: string;
    location: string;
    focalPoint: string;
    focalPointContact: string;
    driverNeeded: boolean;
    sitePermitApproval: 'Yes' | 'No' | '';
  };
  shootType: string;
  indoorFacility: string | null;
  eventTypeDropdown: string;
  customEventTypeInput: string;
  equipmentNeeded: boolean;
  crewAssignments: unknown[];
  departmentAcknowledgements: unknown[];
  equipmentRows: CallsheetDraftEquipmentRow[];
  departmentsToApprove: string[];
  departmentsToNotify: string[];
  transportRequest: object;
  notifications: unknown[];
  /** Files can't be saved - informational only. */
  attachmentCount: number;
};

export interface CallsheetDraftSummary {
  title: string;
  department: string;
  shootType: string;
  equipmentCount: number;
  crewCount: number;
  savedAt: Date;
}

export function callsheetDraftKey(userId: string | number): string {
  return `${DRAFT_PREFIX}:new:${userId}`;
}

export function clearCallsheetDraft(userId: string | number): void {
  try {
    localStorage.removeItem(callsheetDraftKey(userId));
  } catch {
    // Storage unavailable - nothing to clear.
  }
}

export function countDraftEquipment(rows: CallsheetDraftEquipmentRow[] | undefined): number {
  return (rows ?? []).filter((r) => r.inventoryItemId || r.item?.trim()).length;
}

export function readCallsheetDraftSummary(userId: string | number): CallsheetDraftSummary | null {
  const draft = readFormDraft<CallsheetDraftData>(callsheetDraftKey(userId));
  const formData = draft?.data?.formData;
  if (!draft || !formData) return null;
  return {
    title: formData.title?.trim() || 'Untitled call sheet',
    department: formData.department ?? '',
    shootType: draft.data.shootType ?? '',
    equipmentCount: countDraftEquipment(draft.data.equipmentRows),
    crewCount: (draft.data.crewAssignments ?? []).length,
    savedAt: new Date(draft.savedAt),
  };
}
