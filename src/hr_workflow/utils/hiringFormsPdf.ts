import { PDFDocument } from 'pdf-lib';
import interviewTemplateUrl from '../../assets/interview-evaluation-template.pdf';
import startingDateTemplateUrl from '../../assets/starting-date-template.pdf';
import type { InterviewRecommendation } from '../types/hiringRequest';

export async function loadInterviewEvaluationTemplate(): Promise<Uint8Array> {
  const buf = await fetch(interviewTemplateUrl).then((r) => r.arrayBuffer());
  return new Uint8Array(buf);
}

// The template's 12 scored criteria are laid out as two side-by-side tables
// (4 criteria on the left, 8 on the right), each criterion a row of 5
// checkboxes scored 1 (Deficient) through 5 (Outstanding) — confirmed by
// rendering the template and reading each checkbox's on-page position
// against the visible criteria labels. Grouped by criterion (not flat) so a
// criterion only ever contributes its single highest-checked score, even if
// more than one box in its row ends up checked.
export const CRITERIA_CHECKBOX_GROUPS: readonly (readonly string[])[] = [
  ['1', '13', '21', '29', '37'], // Prior Work Experience
  ['45', '46', '47', '48', '49'], // Educational Background
  ['50', '51', '52', '53', '54'], // Technical Qualifications/Experience
  ['55', '56', '57', '58', '59'], // body language & Technical Qualifications/Experience
  ['8', '20', '28', '36', '44'], // Attitude and Enthusiasm
  ['7', '19', '27', '35', '43'], // Creativity
  ['6', '18', '26', '34', '42'], // Problem Solving
  ['5', '17', '25', '33', '41'], // Stress tolerance
  ['4', '16', '24', '32', '40'], // Time management
  ['3', '15', '23', '31', '39'], // Takes initiative
  ['2', '14', '22', '30', '38'], // Candidate Interest
  ['60', '61', '62', '63', '64'], // Presentation
];

/** Percentage = (Total Score / 60) × 100, where Total Score is the sum of
 * the 12 criteria's scores (12 rows × max 5 points each = 60). Replaces the
 * old manually-typed Final Value (%) field — the interviewer only checks
 * boxes on the document, this reads them back live. */
export function calculateInterviewScorePercent(checkboxValues: Record<string, boolean>): number {
  let total = 0;
  for (const group of CRITERIA_CHECKBOX_GROUPS) {
    let rowScore = 0;
    group.forEach((fieldName, i) => {
      if (checkboxValues[fieldName]) rowScore = Math.max(rowScore, i + 1);
    });
    total += rowScore;
  }
  return Math.round((total / 60) * 100);
}

// The template's own "Overall Impression and Recommendation" row has 4
// checkboxes — confirmed the same way as the criteria grid, by rendering the
// template and reading each box's position against the visible labels, left
// to right: Recommend For Hire, Performance Practical Test, Not A Match,
// Decision Not Yet Made.
export const RECOMMENDATION_CHECKBOX_GROUP: readonly string[] = ['9', '10', '11', '12'];

const RECOMMENDATION_BY_CHECKBOX: Record<string, InterviewRecommendation> = {
  '9': 'RecommendForHire',
  '10': 'PracticalTest',
  '11': 'NotAMatch',
  '12': 'DecisionNotYetMade',
};

/** Replaces the old separate "Recommendation" dropdown — reads back whichever
 * of the 4 recommendation boxes is checked directly on the document, same
 * pattern as the criteria score. Returns null if none is checked yet. */
export function getCheckedRecommendation(checkboxValues: Record<string, boolean>): InterviewRecommendation | null {
  for (const field of RECOMMENDATION_CHECKBOX_GROUP) {
    if (checkboxValues[field]) return RECOMMENDATION_BY_CHECKBOX[field];
  }
  return null;
}

// Date Of Interview and Final Value (%) — same field-identification method
// as everything else in this file. Unlike the candidate-identity fields,
// these two are deliberately left blank by prefillInterviewEvaluationTemplate
// (neither is known that early), so they have to be baked in separately, at
// submit time, from the toolbar's own interviewDate/calculated score state.
const INTERVIEW_SUMMARY_FIELD_NAMES = {
  dateOfInterview: 'Text20',
  finalValuePercent: 'Text17',
} as const;

/** Returns a copy of `textValues` (the editor's live field values) with the
 * Date Of Interview and Final Value (%) cells filled in, so the toolbar's
 * values actually show up on the saved document instead of staying blank. */
export function withInterviewSummaryFields(
  textValues: Record<string, string>,
  data: { interviewDateIso: string; finalValuePercent: number }
): Record<string, string> {
  const [y, m, d] = data.interviewDateIso.split('-');
  return {
    ...textValues,
    [INTERVIEW_SUMMARY_FIELD_NAMES.dateOfInterview]: y && m && d ? `${d}/${m}/${y}` : '',
    [INTERVIEW_SUMMARY_FIELD_NAMES.finalValuePercent]: `${data.finalValuePercent}%`,
  };
}

export interface InterviewEvaluationPrefillData {
  candidateName?: string | null;
  nationality?: string | null;
  /** ISO date string — split into the template's separate day/month/year boxes. */
  dob?: string | null;
  mobileNumber?: string | null;
  email?: string | null;
  positionApplied?: string | null;
  department?: string | null;
}

// The template's AcroForm fields have generic auto-generated names (Text13,
// "Date 1", …), not descriptive ones — this mapping was confirmed by reading
// each field's on-page rectangle against the rendered layout, not guessed
// from the names. Candidate Name/Nationality/DOB/Mobile/Email come from the
// candidate's own Freelance Profile Form submission; Position
// Applied/Department come from the hiring request itself (set by HR/the
// Coordinator when the request was created, not typed by the candidate).
const INTERVIEW_FIELD_NAMES = {
  candidateName: 'Text13',
  nationality: 'Text14',
  dobDay: 'Date',
  dobMonth: 'Date 1',
  dobYear: 'Date 3',
  mobileNumber: 'Text15',
  email: 'Text16',
  positionApplied: 'Text19',
  department: 'Text18',
  // The header "Date:" triple (top-right, next to the logos) — the date the
  // form is being filled out, not sourced from any record.
  formDateDay: 'Date 4',
  formDateMonth: 'Date 6',
  formDateYear: 'Date 7',
} as const;

/** Pre-fills the read-only-by-source fields (candidate identity + where
 * they're applying) before the template is handed to InteractivePdfEditor,
 * so the interviewer never has to retype data the system already has.
 * Mirrors the "pre-filled from the employee record" pattern already used by
 * the Contract Renewal editor: values are baked into the PDF's own form
 * fields (not flattened), so they still render as editable overlay inputs —
 * the interviewer can correct a value if the source record is stale.
 * Also fills the header "Date:" box with today's date. Date Of Interview and
 * Final Value (%) are deliberately left blank: they aren't part of the
 * candidate's submission, they're determined by/after the interview itself. */
export async function prefillInterviewEvaluationTemplate(
  pdfBytes: Uint8Array,
  data: InterviewEvaluationPrefillData
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  const setIfPresent = (fieldName: string, value: string | null | undefined) => {
    if (!value) return;
    try {
      form.getTextField(fieldName).setText(value);
    } catch {
      // Not a text field, or missing from this template revision — skip.
    }
  };

  setIfPresent(INTERVIEW_FIELD_NAMES.candidateName, data.candidateName);
  setIfPresent(INTERVIEW_FIELD_NAMES.nationality, data.nationality);
  setIfPresent(INTERVIEW_FIELD_NAMES.mobileNumber, data.mobileNumber);
  setIfPresent(INTERVIEW_FIELD_NAMES.email, data.email);
  setIfPresent(INTERVIEW_FIELD_NAMES.positionApplied, data.positionApplied);
  setIfPresent(INTERVIEW_FIELD_NAMES.department, data.department);

  if (data.dob) {
    const d = new Date(data.dob);
    if (!Number.isNaN(d.getTime())) {
      setIfPresent(INTERVIEW_FIELD_NAMES.dobDay, String(d.getDate()).padStart(2, '0'));
      setIfPresent(INTERVIEW_FIELD_NAMES.dobMonth, String(d.getMonth() + 1).padStart(2, '0'));
      setIfPresent(INTERVIEW_FIELD_NAMES.dobYear, String(d.getFullYear()));
    }
  }

  const today = new Date();
  setIfPresent(INTERVIEW_FIELD_NAMES.formDateDay, String(today.getDate()).padStart(2, '0'));
  setIfPresent(INTERVIEW_FIELD_NAMES.formDateMonth, String(today.getMonth() + 1).padStart(2, '0'));
  setIfPresent(INTERVIEW_FIELD_NAMES.formDateYear, String(today.getFullYear()));

  return pdfDoc.save();
}

export async function loadStartingDateTemplate(): Promise<Uint8Array> {
  const buf = await fetch(startingDateTemplateUrl).then((r) => r.arrayBuffer());
  return new Uint8Array(buf);
}

// Unlike the Interview Evaluation template, this one's fields are mostly
// sensibly named already ("Name", "Date", "CEO Hiring Approval Reference
// No") — only the generic ones ("fill_1", "f2", …) needed their position
// read against the rendered layout to identify. "Employee No." (fill_1) and
// "Section" (fill_6, see STARTING_DATE_SECTION_FIELD) are deliberately not
// prefilled from candidate data: no employee number exists yet (submitting
// this form is what creates the hr_employees record), and no Section value
// exists anywhere upstream of this form — Section is instead picked from a
// toolbar dropdown and synced in at submit time, same as the starting date
// itself and the job title.
const STARTING_DATE_FIELD_NAMES = {
  date: 'Date',
  ceoApprovalReferenceNo: 'CEO Hiring Approval Reference No',
  name: 'Name',
  jobTitle: 'fill_2',
  qid: 'fill_3',
  mobile: 'fill_4',
  department: 'fill_5',
  section: 'fill_6',
  startYear: 'fill_7',
  startMonth: 'fill_8',
  startDay: 'fill_9',
  earnedMonthlyRewardAmount: 'fill_10',
} as const;

const STARTING_DATE_CHECKBOX_NAMES = {
  freelancerEmployee: 'Check Box2',
  earnedMonthlyReward: 'Check1111',
} as const;

export interface StartingDatePrefillData {
  /** The candidate's own submitted name, not what the Coordinator typed when requesting the link. */
  candidateName?: string | null;
  qid?: string | null;
  mobileNumber?: string | null;
  department?: string | null;
  positionTitle?: string | null;
  ceoApprovalReferenceNo?: string | null;
  /** From the CEO approval step — only checks/fills the "Earned Monthly Reward" row if set. */
  monthlyReward?: number | null;
}

/** Pre-fills everything this form already has a real source of truth for —
 * same "bake into the live form fields, don't flatten" pattern as the
 * Interview Evaluation prefill, so values stay editable afterward. Also
 * checks "Freelancer employee", since this form only ever exists within the
 * New Freelancer Hiring pipeline. */
export async function prefillStartingDateTemplate(
  pdfBytes: Uint8Array,
  data: StartingDatePrefillData
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  const setIfPresent = (fieldName: string, value: string | null | undefined) => {
    if (!value) return;
    try {
      form.getTextField(fieldName).setText(value);
    } catch {
      // Not a text field, or missing from this template revision — skip.
    }
  };
  const check = (fieldName: string) => {
    try {
      form.getCheckBox(fieldName).check();
    } catch {
      // Not a checkbox, or missing — skip.
    }
  };

  const today = new Date();
  setIfPresent(
    STARTING_DATE_FIELD_NAMES.date,
    `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`
  );
  setIfPresent(STARTING_DATE_FIELD_NAMES.ceoApprovalReferenceNo, data.ceoApprovalReferenceNo);
  setIfPresent(STARTING_DATE_FIELD_NAMES.name, data.candidateName);
  setIfPresent(STARTING_DATE_FIELD_NAMES.jobTitle, data.positionTitle);
  setIfPresent(STARTING_DATE_FIELD_NAMES.qid, data.qid);
  setIfPresent(STARTING_DATE_FIELD_NAMES.mobile, data.mobileNumber);
  setIfPresent(STARTING_DATE_FIELD_NAMES.department, data.department);

  check(STARTING_DATE_CHECKBOX_NAMES.freelancerEmployee);

  if (data.monthlyReward != null) {
    check(STARTING_DATE_CHECKBOX_NAMES.earnedMonthlyReward);
    setIfPresent(STARTING_DATE_FIELD_NAMES.earnedMonthlyRewardAmount, `QAR ${data.monthlyReward.toLocaleString()}`);
  }

  return pdfDoc.save();
}

/** Keeps the document's own Job Title/Section/Starting-Date fields in sync
 * with whatever the Coordinator currently has set in the toolbar — called
 * right before the final submit, same "inject into the live field-value map"
 * pattern as withInterviewSummaryFields. */
export function withStartingDateSummaryFields(
  textValues: Record<string, string>,
  data: { startingDateIso: string; jobTitleEn: string; sectionName: string | null }
): Record<string, string> {
  const [y, m, d] = data.startingDateIso.split('-');
  return {
    ...textValues,
    [STARTING_DATE_FIELD_NAMES.jobTitle]: data.jobTitleEn,
    [STARTING_DATE_FIELD_NAMES.startYear]: y ?? '',
    [STARTING_DATE_FIELD_NAMES.startMonth]: m ?? '',
    [STARTING_DATE_FIELD_NAMES.startDay]: d ?? '',
    ...(data.sectionName ? { [STARTING_DATE_FIELD_NAMES.section]: data.sectionName } : {}),
  };
}

/** Bakes the coordinator's typed/checked values (read live from
 * InteractivePdfEditor) into the official template — same mechanism as the
 * contract's applyCoordinatorFields, extended to also handle this template's
 * checkbox fields (score boxes, recommendation).
 * `flatten` defaults to true (the normal final-submit case: these forms are
 * a one-time record at that point). Pass `false` for an intermediate
 * re-bake — e.g. right before stamping a signature into the document so the
 * editor can reload with that signature visible — since flattening would
 * remove the form field widgets InteractivePdfEditor needs to keep showing
 * everything as editable. */
export async function applyHiringFormValues(
  pdfBytes: Uint8Array,
  textValues: Record<string, string>,
  checkboxValues: Record<string, boolean>,
  flatten: boolean = true
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  for (const [name, value] of Object.entries(textValues)) {
    if (!value.trim()) continue;
    try {
      form.getTextField(name).setText(value);
    } catch {
      // Not a text field, or missing — skip rather than throw.
    }
  }

  for (const [name, checked] of Object.entries(checkboxValues)) {
    try {
      const box = form.getCheckBox(name);
      if (checked) box.check();
      else box.uncheck();
    } catch {
      // Not a checkbox field, or missing — skip rather than throw.
    }
  }

  if (flatten) form.flatten();
  return pdfDoc.save();
}

function newVerificationId(): string {
  return crypto.randomUUID();
}

async function stampPlainSignature(
  pdfDoc: PDFDocument,
  pageIndex: number,
  rect: { x: number; y: number; width: number; height: number },
  imageBytes: Uint8Array,
  imageType: 'png' | 'jpeg'
) {
  const page = pdfDoc.getPages()[pageIndex];
  if (!page) return;

  const image = imageType === 'jpeg' ? await pdfDoc.embedJpg(imageBytes) : await pdfDoc.embedPng(imageBytes);
  const scale = Math.min(rect.width / image.width, rect.height / image.height, 1);
  const w = image.width * scale;
  const h = image.height * scale;

  page.drawImage(image, {
    x: rect.x + (rect.width - w) / 2,
    y: rect.y + (rect.height - h) / 2,
    width: w,
    height: h,
  });
}

// The Interview Evaluation template's bottom "INTERVIEWER NAME / SIGNATURE"
// table has 4 blank rows, right column reserved for a signature. Row y/height
// taken from the matching Interviewer Name text fields (Text23/26/27/28 —
// exact, pdf-lib-confirmed); the x/width of the Signature column itself was
// confirmed by rendering the template and reading the column divider's
// position, with a small safety margin kept inside the cell's actual border.
// Both the Coordinator (team members who interviewed) and the Department
// Head (their own review sign-off) use these same 4 slots — whoever's
// signing picks whichever row is still visually blank on the rendered page.
export const INTERVIEW_SIGNATURE_ROWS: { x: number; y: number; width: number; height: number }[] = [
  { x: 300, y: 102.221, width: 255, height: 15.793 },
  { x: 300, y: 84.2502, width: 255, height: 16.764 },
  { x: 300, y: 67.4695, width: 255, height: 15.782 },
  { x: 300, y: 49.8893, width: 255, height: 16.109 },
];

/** Stamps a drawn signature into one of the 4 Interviewer Name/Signature
 * rows. Does not flatten the form — caller is expected to have already
 * re-baked any live field/checkbox edits with `applyHiringFormValues(...,
 * false)` first, so nothing the user typed before signing gets lost when
 * this result replaces the working PDF. */
export async function stampInterviewerSignature(
  pdfBytes: Uint8Array,
  rowIndex: number,
  imageBytes: Uint8Array,
  imageType: 'png' | 'jpeg'
): Promise<Uint8Array> {
  const rect = INTERVIEW_SIGNATURE_ROWS[rowIndex];
  if (!rect) throw new Error(`Invalid interviewer signature row: ${rowIndex}`);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  await stampPlainSignature(pdfDoc, 0, rect, imageBytes, imageType);
  return pdfDoc.save();
}

// Coordinates confirmed by rendering the template with debug markers — the
// Starting Date form is a single page with two side-by-side signer blocks
// ("Direct Manager Approval" | "Employee Approval of the details"), each
// with its own blank Sign line, plus a separate "Not Starting Work" row
// whose Sign blank is duplicated across its English and Arabic halves.
const STARTING_DATE_PAGE_INDEX = 0;
const MANAGER_START_SIGN_RECT = { x: 90, y: 229.32, width: 180, height: 25.7 };
const EMPLOYEE_START_SIGN_RECT = { x: 328, y: 229.32, width: 177, height: 25.7 };
const NOT_STARTING_SIGN_RECT_EN = { x: 85, y: 139.22, width: 185, height: 34.2 };
const NOT_STARTING_SIGN_RECT_AR = { x: 330, y: 139.22, width: 175, height: 34.2 };

/** Coordinator captures the candidate's in-person signature confirming they
 * started — stamped into the "Employee Approval of the details" box. */
export async function stampEmployeeStartSignature(
  pdfBytes: Uint8Array,
  imageBytes: Uint8Array,
  imageType: 'png' | 'jpeg'
): Promise<{ bytes: Uint8Array; verificationId: string }> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  await stampPlainSignature(pdfDoc, STARTING_DATE_PAGE_INDEX, EMPLOYEE_START_SIGN_RECT, imageBytes, imageType);
  const bytes = await pdfDoc.save();
  return { bytes, verificationId: newVerificationId() };
}

/** Department Head signs either "Direct Manager Approval" (candidate
 * started) or both halves of "Not Starting Work" (candidate never showed),
 * depending on what the Coordinator already recorded. */
export async function stampManagerStartSignature(
  pdfBytes: Uint8Array,
  imageBytes: Uint8Array,
  imageType: 'png' | 'jpeg',
  intent: 'Started' | 'NotStarted'
): Promise<{ bytes: Uint8Array; verificationId: string }> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  if (intent === 'Started') {
    await stampPlainSignature(pdfDoc, STARTING_DATE_PAGE_INDEX, MANAGER_START_SIGN_RECT, imageBytes, imageType);
  } else {
    await stampPlainSignature(pdfDoc, STARTING_DATE_PAGE_INDEX, NOT_STARTING_SIGN_RECT_EN, imageBytes, imageType);
    await stampPlainSignature(pdfDoc, STARTING_DATE_PAGE_INDEX, NOT_STARTING_SIGN_RECT_AR, imageBytes, imageType);
  }
  const bytes = await pdfDoc.save();
  return { bytes, verificationId: newVerificationId() };
}
