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
