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
