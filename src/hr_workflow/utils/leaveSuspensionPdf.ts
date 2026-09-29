import { PDFDocument, type PDFFont, type PDFForm } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import leaveTemplateUrl from '../../assets/leave-suspension-template.pdf';
import notoSansArabicUrl from '../../assets/NotoSansArabic.ttf';
import type { HrEmployee } from '../types/hrApi';

const FIELD_FONT_SIZE = 9;
const FIELD_MIN_FONT_SIZE = 6;

export async function loadLeaveSuspensionTemplate(): Promise<Uint8Array> {
  const buf = await fetch(leaveTemplateUrl).then((r) => r.arrayBuffer());
  return new Uint8Array(buf);
}

function setFieldFitted(form: PDFForm, font: PDFFont, name: string, value: string) {
  try {
    const field = form.getTextField(name);
    let size = FIELD_FONT_SIZE;
    const rect = field.acroField.getWidgets()[0]?.getRectangle();
    if (rect) {
      const maxWidth = Math.max(rect.width - 4, 0);
      while (size > FIELD_MIN_FONT_SIZE && font.widthOfTextAtSize(value, size) > maxWidth) {
        size -= 0.5;
      }
    }
    field.setFontSize(size);
    field.setText(value);
  } catch {
    // Field missing or not a text field — skip rather than throw.
  }
}

/** Bakes the coordinator's typed/checked values (read live from
 * InteractivePdfEditor) into the leave-suspension template — fields stay
 * live AcroForm fields afterward (not flattened), same as the contract
 * template, so the working copy can still be re-opened and re-saved while
 * in Draft. */
export async function applyLeaveFields(
  pdfBytes: Uint8Array,
  textValues: Record<string, string>,
  checkboxValues: Record<string, boolean>
): Promise<Uint8Array> {
  const fontBytes = await fetch(notoSansArabicUrl).then((r) => r.arrayBuffer());

  const pdfDoc = await PDFDocument.load(pdfBytes);
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fontBytes, { subset: true });
  const form = pdfDoc.getForm();

  for (const [name, value] of Object.entries(textValues)) {
    if (!value.trim()) continue;
    setFieldFitted(form, font, name, value);
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

  form.updateFieldAppearances(font);
  return pdfDoc.save();
}

// Auto-fills the "Freelancer's Information" block from the employee record —
// safe to do here (unlike the contract template's cryptic Adobe-generated
// field names) since these field names were chosen by us when the fillable
// template was built, so the mapping is exact by construction.
export async function fillLeaveEmployeeInfo(templateBytes: Uint8Array, employee: HrEmployee): Promise<Uint8Array> {
  return applyLeaveFields(
    templateBytes,
    {
      freelancer_name: employee.fullNameEn,
      freelancer_number: employee.associateJobNo ?? '',
      freelancer_title: employee.jobTitleEn,
      freelancer_department: employee.departmentNameEn ?? '',
      freelancer_contact_number: employee.mobileNumber ?? '',
      freelancer_email: employee.emailWork ?? employee.emailPersonal ?? '',
    },
    {}
  );
}

function newVerificationId(): string {
  return crypto.randomUUID();
}

// Plain image stamp, no caption — these two spots are compact printed
// signature lines on the real document (not the generously-sized signature
// panel the contract template has), so a caption/verification-id overlay
// would visually crowd the row. The verification id is still recorded to
// the backend and available via the audit trail.
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

// Page 2 (index 1), the "Signature:" row in the "Issued by the Competent
// Department" table — coordinates confirmed by rendering the template with
// debug field overlays.
const DEPT_HEAD_SIGNATURE_PAGE_INDEX = 1;
const DEPT_HEAD_SIGNATURE_RECT = { x: 234.1, y: 150.12, width: 174.6, height: 16.8 };

export async function stampDeptHeadSignature(
  pdfBytes: Uint8Array,
  imageBytes: Uint8Array,
  imageType: 'png' | 'jpeg'
): Promise<{ bytes: Uint8Array; verificationId: string }> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  await stampPlainSignature(pdfDoc, DEPT_HEAD_SIGNATURE_PAGE_INDEX, DEPT_HEAD_SIGNATURE_RECT, imageBytes, imageType);
  const bytes = await pdfDoc.save();
  return { bytes, verificationId: newVerificationId() };
}

// Page 3 (index 2), the blank strip below "Freelancer's Signature:" in the
// Acknowledgment of Receipt table.
const FREELANCER_SIGNATURE_PAGE_INDEX = 2;
const FREELANCER_SIGNATURE_RECT = { x: 54, y: 380.32, width: 486, height: 35.7 };

export async function stampFreelancerSignature(
  pdfBytes: Uint8Array,
  imageBytes: Uint8Array,
  imageType: 'png' | 'jpeg'
): Promise<{ bytes: Uint8Array; verificationId: string }> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  await stampPlainSignature(pdfDoc, FREELANCER_SIGNATURE_PAGE_INDEX, FREELANCER_SIGNATURE_RECT, imageBytes, imageType);
  const bytes = await pdfDoc.save();
  return { bytes, verificationId: newVerificationId() };
}
