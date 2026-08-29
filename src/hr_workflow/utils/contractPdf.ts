import { PDFDocument, rgb, type PDFFont, type PDFForm } from 'pdf-lib';
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

  const today = formatDateEn(new Date().toISOString());

  // Contract date — both EN and AR sides get today's date. The template has
  // a Gregorian + Hijri pair; we don't do Hijri conversion, so both get the
  // same Gregorian-formatted date for now (low-stakes, coordinator reviews
  // before this goes anywhere near a signature).
  setField('on', today);
  setField('Date 12', today);
  setField('Date 11', today);
  setField('fill_2', today);

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
): Promise<Uint8Array> {
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

  // A short, non-cryptographic verification code — not a real digital
  // signature/certificate, just a visual "this was captured by the system"
  // marker, in the spirit of the bordered "Signed by:" stamp box requested.
  const verificationId = Math.random().toString(36).slice(2, 10).toUpperCase();
  const pages = pdfDoc.getPages();

  for (const placement of placements) {
    const page = pages[placement.pageIndex];
    if (!page) continue;

    const image = placement.imageType === 'jpeg'
      ? await pdfDoc.embedJpg(placement.imageBytes)
      : await pdfDoc.embedPng(placement.imageBytes);

    const { x, y, width: boxWidth, height: boxHeight } = placement;

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

  return pdfDoc.save();
}
