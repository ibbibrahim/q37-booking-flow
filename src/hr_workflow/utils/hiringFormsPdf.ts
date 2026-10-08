import { PDFDocument } from 'pdf-lib';
import interviewTemplateUrl from '../../assets/interview-evaluation-template.pdf';
import startingDateTemplateUrl from '../../assets/starting-date-template.pdf';

export async function loadInterviewEvaluationTemplate(): Promise<Uint8Array> {
  const buf = await fetch(interviewTemplateUrl).then((r) => r.arrayBuffer());
  return new Uint8Array(buf);
}

export async function loadStartingDateTemplate(): Promise<Uint8Array> {
  const buf = await fetch(startingDateTemplateUrl).then((r) => r.arrayBuffer());
  return new Uint8Array(buf);
}

/** Bakes the coordinator's typed/checked values (read live from
 * InteractivePdfEditor) into the official template and flattens the result —
 * same mechanism as the contract's applyCoordinatorFields, extended to also
 * handle this template's checkbox fields (score boxes, recommendation), then
 * flattened since these two forms are a one-time record, not re-edited like
 * a contract working copy. */
export async function applyHiringFormValues(
  pdfBytes: Uint8Array,
  textValues: Record<string, string>,
  checkboxValues: Record<string, boolean>
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

  form.flatten();
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
