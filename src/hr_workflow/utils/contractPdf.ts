import { PDFDocument } from 'pdf-lib';
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

function formatDateEn(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB'); // DD/MM/YYYY
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

  const setField = (name: string, value: string | null | undefined) => {
    if (!value) return;
    try {
      form.getTextField(name).setText(value);
    } catch {
      // Field missing or not a text field — skip rather than throw, so one
      // bad name doesn't break the whole fill.
    }
  };

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

// Page 10 (index 9) has the three signature blocks (two fixed QBC
// signatories + the Second Party/employee). The employee's printed name and
// date ARE real form fields ("Mr", "Mr_2", "Date 29", "Date 30" — confirmed
// the same way as the page 1 fields), but the "Signature:" line itself is
// NOT a form field on this template at all — just static dotted text — so
// the signature image has to be drawn directly onto the page. These
// rectangles are estimated from the gap between the confirmed name field
// and date field above/below the signature line, not pixel-verified against
// a real signature yet.
const EMPLOYEE_SIGNATURE_PAGE_INDEX = 9;
const EMPLOYEE_SIGNATURE_RECT_EN = { x: 65, y: 188, width: 150, height: 38 };
const EMPLOYEE_SIGNATURE_RECT_AR = { x: 340, y: 178, width: 150, height: 38 };

export async function stampEmployeeSignature(
  filledPdfBytes: Uint8Array,
  signatureImageBytes: Uint8Array,
  signatureImageType: 'png' | 'jpeg',
  employee: HrEmployee
): Promise<Uint8Array> {
  const fontBytes = await fetch(notoSansArabicUrl).then((r) => r.arrayBuffer());

  const pdfDoc = await PDFDocument.load(filledPdfBytes);
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fontBytes, { subset: true });
  const form = pdfDoc.getForm();

  const setField = (name: string, value: string | null | undefined) => {
    if (!value) return;
    try {
      form.getTextField(name).setText(value);
    } catch {
      // ignore
    }
  };

  const today = formatDateEn(new Date().toISOString());
  setField('Mr', employee.fullNameEn);
  setField('Mr_2', employee.fullNameAr);
  setField('Date 29', today);
  setField('Date 30', today);
  form.updateFieldAppearances(font);

  const signatureImage = signatureImageType === 'jpeg'
    ? await pdfDoc.embedJpg(signatureImageBytes)
    : await pdfDoc.embedPng(signatureImageBytes);
  const page = pdfDoc.getPages()[EMPLOYEE_SIGNATURE_PAGE_INDEX];

  for (const rect of [EMPLOYEE_SIGNATURE_RECT_EN, EMPLOYEE_SIGNATURE_RECT_AR]) {
    const scale = Math.min(rect.width / signatureImage.width, rect.height / signatureImage.height, 1);
    const w = signatureImage.width * scale;
    const h = signatureImage.height * scale;
    page.drawImage(signatureImage, {
      x: rect.x + (rect.width - w) / 2,
      y: rect.y + (rect.height - h) / 2,
      width: w,
      height: h,
    });
  }

  return pdfDoc.save();
}
