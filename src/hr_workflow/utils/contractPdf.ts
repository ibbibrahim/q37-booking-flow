import { PDFDocument, rgb, type PDFFont, type PDFForm, type PDFPage, type PDFImage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import contractTemplateUrl from '../../assets/contract-template.pdf';
import notoSansArabicUrl from '../../assets/NotoSansArabic.ttf';
import type { HrEmployee } from '../types/hrApi';

// The template PDF already has real fillable form fields (verified by
// rendering it with debug markers and checking where each one lands) —
// setting values on those is far more reliable than drawing text at
// hardcoded X/Y coordinates. The field names below are Adobe Acrobat's
// auto-generated ones (meaningless on their own: "fill_6", "Second Mr_3"),
// confirmed one at a time against the rendered page.
//
// NOTE: only fields confirmed by visual inspection are filled here. The
// Arabic-side nationality/passport/QID-number cluster (fields "fill_6",
// "fill_67", "fill_7") sit close enough together with inconsistent
// auto-generated names that their exact mapping is still unconfirmed —
// left blank intentionally rather than risk placing data in the wrong
// slot on a legal document. The English side of those same fields IS
// confirmed and filled. The Arabic name's second (continuation) field is
// also left unused for now — long names may overflow the first field's
// width, worth revisiting once the rest of the fields are mapped.

// Matches the surrounding printed body text — small enough to sit clear of
// the underline instead of the field's default "auto" size, which stretches
// to fill the whole field height and crams the text against the line.
const FIELD_FONT_SIZE = 9;
const FIELD_MIN_FONT_SIZE = 6;

function formatDateEn(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB'); // DD/MM/YYYY
}

// Page 1's "It is on {day} corresponding to {date}, in Doha..." line wants
// the day name (e.g. "Monday"), not another date — confirmed by stamping
// 'on'/'Date 12' (English) and 'fill_2'/'Date 11' (Arabic mirror) and
// rendering the page: the day-name blank comes first on both sides, the
// date blank second.
const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAMES_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function dayNameEn(date: Date): string {
  return DAY_NAMES_EN[date.getDay()];
}

function dayNameAr(date: Date): string {
  return DAY_NAMES_AR[date.getDay()];
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// The "Second: Works and Tasks" department blank is immediately followed by
// a literal printed "Department"/"إدارة" in the template — department names
// in this system already include that word (e.g. "Operation Department",
// "إدارة العمليات"), so filling the blank unmodified doubles it (confirmed
// by rendering: "...at the Operation Department **Department** (as
// prescribed...)"). Strip it off for just this one blank.
function stripDepartmentSuffixEn(name: string | null | undefined): string | null | undefined {
  const stripped = name?.replace(/\s*Department\s*$/i, '').trim();
  return stripped || name;
}

function stripDepartmentSuffixAr(name: string | null | undefined): string | null | undefined {
  const stripped = name?.replace(/^\s*إدارة\s*/, '').trim();
  return stripped || name;
}

/** Sets a text field's value, shrinking the font size (down to a floor)
 * until the text actually fits the field's real width — a fixed size looks
 * right for short values but pdf-lib doesn't clip long ones, so they render
 * straight past the box's right edge into whatever sits next to it on the
 * page (e.g. a long name bleeding into the Arabic column next to it). */
function setFieldFitted(form: PDFForm, font: PDFFont, name: string, value: string | null | undefined) {
  if (!value) return;
  try {
    const field = form.getTextField(name);

    let size = FIELD_FONT_SIZE;
    const rect = field.acroField.getWidgets()[0]?.getRectangle();
    if (rect) {
      const maxWidth = Math.max(rect.width - 4, 0); // small inner padding
      while (size > FIELD_MIN_FONT_SIZE && font.widthOfTextAtSize(value, size) > maxWidth) {
        size -= 0.5;
      }
    }

    field.setFontSize(size);
    field.setText(value);
  } catch {
    // Field missing or not a text field — skip rather than throw, so one
    // bad name doesn't break the whole fill.
  }
}

// Page 3, "Third: The Contract Term and Enforceability" — confirmed by
// stamping each candidate field with its own name and rendering the page:
// English reads "...set as of {Date 20} until {Date 21}", the Arabic mirror
// (read right-to-left) is "...في تاريخ {Date 19} وحتى تاريخ {Date 18}". The
// month-count fields are oddly named by the original PDF conversion tool —
// "until" is actually the English numeral blank ("shall be (......)"), not a
// date field at all; "fill_1_3" is its Arabic counterpart. The spelled-out
// continuation blank (fill_3_2) is left empty rather than built out with a
// number-to-words converter.
const CONTRACT_DATE_FIELD_NAMES = {
  startDateEn: 'Date 20',
  endDateEn: 'Date 21',
  startDateAr: 'Date 19',
  endDateAr: 'Date 18',
  monthsEn: 'until',
  monthsAr: 'fill_1_3',
} as const;

// Page 3, "Fourth: The Value of Services" — confirmed the same way as the
// date fields above: English reads "...a Total amount of {total} QR (Only
// {spelled-out, left blank — no number-to-words converter, same call as the
// months field below} Qatari Riyals) to be paid on a monthly basis at an
// amount of (QR {monthly})...", Arabic mirrors the same structure.
const VALUE_OF_SERVICES_FIELD_NAMES = {
  totalEn: 'Total amount of_8',
  totalAr: 'fill_6_3',
  monthlyEn: 'Qatari Riyals to be paid on a monthly basis at an',
  monthlyAr: 'fill_6_333',
} as const;

// A same-calendar-month range (e.g. 1 Nov – 30 Nov) is still a real
// 1-month contract, not "0 months" — floors at 1 for any forward date
// range rather than showing a literal zero on a legal document.
function monthsBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(months, 1);
}

/** Keeps the contract's validity-period and value-of-services fields (page
 * 3) in sync with the Start/End Date and the employee's monthly rate
 * captured when the contract was created — same "inject into the live
 * field-value map" pattern used for the Interview/Starting Date forms. Both
 * the English and Arabic sides get the same Gregorian dates (same "no Hijri
 * conversion" simplification already used for the contract date elsewhere
 * in this file) and the same numerals (QR amounts aren't translated). */
export function withContractDateFields(
  values: Record<string, string>,
  data: { startDateIso: string; endDateIso: string; monthlyRate?: number | null }
): Record<string, string> {
  const startEn = formatDateEn(data.startDateIso);
  const endEn = formatDateEn(data.endDateIso);
  const months = monthsBetween(data.startDateIso, data.endDateIso);

  const result: Record<string, string> = {
    ...values,
    [CONTRACT_DATE_FIELD_NAMES.startDateEn]: startEn,
    [CONTRACT_DATE_FIELD_NAMES.endDateEn]: endEn,
    [CONTRACT_DATE_FIELD_NAMES.startDateAr]: startEn,
    [CONTRACT_DATE_FIELD_NAMES.endDateAr]: endEn,
    [CONTRACT_DATE_FIELD_NAMES.monthsEn]: String(months),
    [CONTRACT_DATE_FIELD_NAMES.monthsAr]: String(months),
  };

  if (data.monthlyRate != null && data.monthlyRate > 0) {
    const monthly = formatCurrency(data.monthlyRate);
    const total = formatCurrency(data.monthlyRate * months);
    result[VALUE_OF_SERVICES_FIELD_NAMES.totalEn] = total;
    result[VALUE_OF_SERVICES_FIELD_NAMES.totalAr] = total;
    result[VALUE_OF_SERVICES_FIELD_NAMES.monthlyEn] = monthly;
    result[VALUE_OF_SERVICES_FIELD_NAMES.monthlyAr] = monthly;
  }

  return result;
}

/** Merges the coordinator's field values (read live from the interactive
 * editor) into the contract PDF and returns the updated bytes — same
 * mechanism as the auto-fill, just driven by the coordinator's own typing
 * instead of the employee record. */
export async function applyCoordinatorFields(
  pdfBytes: Uint8Array,
  values: Record<string, string>
): Promise<Uint8Array> {
  const fontBytes = await fetch(notoSansArabicUrl).then((r) => r.arrayBuffer());

  const pdfDoc = await PDFDocument.load(pdfBytes);
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fontBytes, { subset: true });
  const form = pdfDoc.getForm();

  for (const [name, value] of Object.entries(values)) {
    if (!value.trim()) continue;
    setFieldFitted(form, font, name, value);
  }

  form.updateFieldAppearances(font);
  return pdfDoc.save();
}

export async function fillContractTemplate(employee: HrEmployee): Promise<Uint8Array> {
  const [templateBytes, fontBytes] = await Promise.all([
    fetch(contractTemplateUrl).then((r) => r.arrayBuffer()),
    fetch(notoSansArabicUrl).then((r) => r.arrayBuffer()),
  ]);

  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fontBytes, { subset: true });

  const form = pdfDoc.getForm();
  const setField = (name: string, value: string | null | undefined) => setFieldFitted(form, font, name, value);

  const now = new Date();
  const today = formatDateEn(now.toISOString());

  // Contract date line — "It is on {day} corresponding to {date}, in
  // Doha...": day-name blank first, Gregorian-date blank second, confirmed
  // by stamping each candidate field and rendering the page. The template
  // has a Gregorian + Hijri pair for the date itself; we don't do Hijri
  // conversion, so both sides get the same Gregorian-formatted date (low-
  // stakes, coordinator reviews before this goes anywhere near a signature).
  setField('on', dayNameEn(now));
  setField('Date 12', today);
  setField('Date 11', today);
  setField('fill_2', dayNameAr(now));

  // Job title — appears twice: the Preamble's "requires the services of
  // ___" and "Second: Works and Tasks"'s "in the field of ___". Both are
  // the same concept (what the employee was engaged to do), confirmed by
  // stamping each field and rendering the page.
  setField('for Qatar Media Corporation QBC and likewise', employee.jobTitleEn);
  setField('fill_1_2', employee.jobTitleAr);
  setField('as prescribed in Appendix No 1 of this contract at 1111', employee.jobTitleEn);
  setField('fill_6_2', employee.jobTitleAr);

  // Department — "Second: Works and Tasks"'s "at the ___ Department".
  setField('as prescribed in Appendix No 1 of this contract at the', stripDepartmentSuffixEn(employee.departmentNameEn));
  setField('fill_4_2', stripDepartmentSuffixAr(employee.departmentNameAr));

  // Employee name
  setField('Second Mr', employee.fullNameEn);
  setField('fill_4', employee.fullNameAr);

  // Nationality / passport / QID — English side confirmed.
  setField('Second Mr_3', employee.nationality);
  setField('Second Mr_4', employee.passportNumber);
  setField('Second Mr_6', employee.qid);
  if (employee.qidExpiry) setField('Date 15', formatDateEn(employee.qidExpiry));

  // Contact info — confirmed on both sides.
  const email = employee.emailWork ?? employee.emailPersonal;
  setField('Mobile number', employee.mobileNumber);
  setField('Email', email);
  setField('fill_10', email);
  setField('Date 14', employee.mobileNumber);

  form.updateFieldAppearances(font);

  return pdfDoc.save();
}

/** One signature the employee dropped onto the document via the DocuSign-
 * style placement editor — page index plus a PDF-space rect (bottom-left
 * origin, matching pdf-lib's coordinate system) it should be stamped into. */
export interface SignaturePlacement {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  imageBytes: Uint8Array;
  imageType: 'png' | 'jpeg';
}

// Draws one "Signed by: <image> <verificationId>" stamp box — the shared
// visual used for every signer (employee, Department Head, ...). A single
// non-cryptographic verification code per call keeps the two mirrored EN/AR
// boxes matching each other but distinct from other signers' stamps.
async function drawSignatureStampBox(
  page: PDFPage,
  font: PDFFont,
  image: PDFImage,
  rect: { x: number; y: number; width: number; height: number },
  verificationId: string
) {
  const { x, y, width: boxWidth, height: boxHeight } = rect;

  page.drawRectangle({
    x,
    y,
    width: boxWidth,
    height: boxHeight,
    borderColor: rgb(0.29, 0.33, 0.85),
    borderWidth: 1,
  });
  page.drawText('Signed by:', {
    x: x + 3,
    y: y + boxHeight - 9,
    size: 6,
    font,
    color: rgb(0.29, 0.33, 0.85),
  });

  const imgAreaHeight = boxHeight - 20;
  const scale = Math.min((boxWidth - 6) / image.width, imgAreaHeight / image.height, 1);
  const w = image.width * scale;
  const h = image.height * scale;
  page.drawImage(image, {
    x: x + (boxWidth - w) / 2,
    y: y + 10 + (imgAreaHeight - h) / 2,
    width: w,
    height: h,
  });

  page.drawText(verificationId, {
    x: x + 3,
    y: y + 2,
    size: 5,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
}

// A real UUID (not a Math.random() label) — this same value is stamped onto
// the PDF below AND sent to the backend on the sign call so it's stored
// verbatim in the signature row. What's printed on the document is then a
// provable reference into that row, not just cosmetic text that happens to
// look like an ID.
function newVerificationId(): string {
  return crypto.randomUUID();
}

// Page 10's printed name/date next to the Second Party's signature line ARE
// real form fields ("Mr", "Mr_2", "Date 29", "Date 30" — confirmed the same
// way as the page 1 fields) and get filled automatically here regardless of
// where the employee actually drops their signature image below — the
// signature itself isn't a form field on this template at all, just static
// dotted text, so it's drawn directly onto the page at whatever rect(s) the
// coordinator/employee placed it at.
export async function stampSignaturesAtPositions(
  filledPdfBytes: Uint8Array,
  placements: SignaturePlacement[],
  employee: HrEmployee
): Promise<{ bytes: Uint8Array; verificationId: string }> {
  const fontBytes = await fetch(notoSansArabicUrl).then((r) => r.arrayBuffer());

  const pdfDoc = await PDFDocument.load(filledPdfBytes);
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fontBytes, { subset: true });
  const form = pdfDoc.getForm();
  const setField = (name: string, value: string | null | undefined) => setFieldFitted(form, font, name, value);

  const today = formatDateEn(new Date().toISOString());
  setField('Mr', employee.fullNameEn);
  setField('Mr_2', employee.fullNameAr);
  setField('Date 29', today);
  setField('Date 30', today);
  form.updateFieldAppearances(font);

  const verificationId = newVerificationId();
  const pages = pdfDoc.getPages();

  for (const placement of placements) {
    const page = pages[placement.pageIndex];
    if (!page) continue;

    const image = placement.imageType === 'jpeg'
      ? await pdfDoc.embedJpg(placement.imageBytes)
      : await pdfDoc.embedPng(placement.imageBytes);

    await drawSignatureStampBox(page, font, image, placement, verificationId);
  }

  const bytes = await pdfDoc.save();
  return { bytes, verificationId };
}

// The Department Head's approval doesn't need manual placement the way the
// employee's did — there's nowhere else it could sensibly go, and speed
// matters more here (a Department Head is clearing a queue of many
// contracts, not carefully placing one). It's stamped automatically at a
// fixed spot: the blank space at the bottom of page 11's appendix table
// (verified by rendering the real template — page 12 is almost entirely
// consumed by the "Contracted services and tasks" field and has no room;
// page 11's last row has unused space below its text with no printed
// content in it).
const DEPARTMENT_HEAD_PAGE_INDEX = 10; // page 11
const DEPARTMENT_HEAD_RECT_EN = { x: 50, y: 55, width: 240, height: 80 };
const DEPARTMENT_HEAD_RECT_AR = { x: 305, y: 55, width: 240, height: 80 };

export async function stampDepartmentHeadSignature(
  filledPdfBytes: Uint8Array,
  signatureImageBytes: Uint8Array,
  signatureImageType: 'png' | 'jpeg'
): Promise<{ bytes: Uint8Array; verificationId: string }> {
  const fontBytes = await fetch(notoSansArabicUrl).then((r) => r.arrayBuffer());

  const pdfDoc = await PDFDocument.load(filledPdfBytes);
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fontBytes, { subset: true });

  const image = signatureImageType === 'jpeg'
    ? await pdfDoc.embedJpg(signatureImageBytes)
    : await pdfDoc.embedPng(signatureImageBytes);

  const page = pdfDoc.getPages()[DEPARTMENT_HEAD_PAGE_INDEX];
  const verificationId = newVerificationId();

  await drawSignatureStampBox(page, font, image, DEPARTMENT_HEAD_RECT_EN, verificationId);
  await drawSignatureStampBox(page, font, image, DEPARTMENT_HEAD_RECT_AR, verificationId);

  const bytes = await pdfDoc.save();
  return { bytes, verificationId };
}

// GM (Final Signatory) approval — the last stage before Completed. Page 10
// already has the printed "Manager of QBC" officer block (name/title are
// static text baked into the template; only the blank space after
// "Signature:"/"التوقيع:" is actually open) — that's the correct, dedicated
// spot for this, not an improvised blank margin elsewhere. Verified by
// rendering the real template with test rectangles at these exact
// coordinates: they sit cleanly in the gap between the Signature and Date
// lines on both the EN and AR sides, without touching either.
// Sized and positioned to match the Second Party (Employee) signature box on
// this same page exactly — same 44pt height, same column widths (177 EN /
// 206 AR) — rather than the boxier/inconsistent EN-vs-AR proportions used
// before, which looked out of place sitting on the same page as the
// employee's box right below it.
const FINAL_SIGNATORY_PAGE_INDEX = 9; // page 10
const FINAL_SIGNATORY_RECT_EN = { x: 100, y: 334, width: 177, height: 44 };
const FINAL_SIGNATORY_RECT_AR = { x: 327, y: 359, width: 206, height: 44 };

export async function stampFinalSignatorySignature(
  filledPdfBytes: Uint8Array,
  signatureImageBytes: Uint8Array,
  signatureImageType: 'png' | 'jpeg'
): Promise<{ bytes: Uint8Array; verificationId: string }> {
  const fontBytes = await fetch(notoSansArabicUrl).then((r) => r.arrayBuffer());

  const pdfDoc = await PDFDocument.load(filledPdfBytes);
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fontBytes, { subset: true });

  const image = signatureImageType === 'jpeg'
    ? await pdfDoc.embedJpg(signatureImageBytes)
    : await pdfDoc.embedPng(signatureImageBytes);

  const page = pdfDoc.getPages()[FINAL_SIGNATORY_PAGE_INDEX];
  const verificationId = newVerificationId();

  await drawSignatureStampBox(page, font, image, FINAL_SIGNATORY_RECT_EN, verificationId);
  await drawSignatureStampBox(page, font, image, FINAL_SIGNATORY_RECT_AR, verificationId);

  const bytes = await pdfDoc.save();
  return { bytes, verificationId };
}
