import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { hiringRequestApi } from '../api/hiringRequestApi';
import { freelanceProfileReviewApi } from '../api/freelanceProfileApi';
import { hrApi } from '../api/hrApi';
import {
  loadStartingDateTemplate, applyHiringFormValues, prefillStartingDateTemplate, withStartingDateSummaryFields,
} from '../utils/hiringFormsPdf';
import { InteractivePdfEditor, type InteractivePdfEditorHandle } from '../components/InteractivePdfEditor';

/** The actual official "Acknowledgement of Starting Work First Time" PDF
 * template, filled directly on the document — same mechanism as the
 * Interview Evaluation editor and Contract Renewal. Most candidate-identity
 * fields (name, QID, mobile, department, job title, CEO approval reference)
 * are pre-filled from data the system already has; "Employee No." is left
 * blank since no employee record exists until this form is submitted, and
 * "Section" has no upstream data source at all, so it's picked here via the
 * toolbar dropdown instead. The toolbar captures the fields the hiring
 * workflow needs back structurally (starting date, job title, section —
 * used to create the hr_employees record); the rest (department/employee
 * approval blocks, attachments checklist) is filled directly on the
 * rendered PDF. The NOC letter/establishment card/bank certificate are NOT
 * collected here — they're attached later on the hiring request's own
 * Starting Date detail tab, since they often aren't on hand at exactly this
 * moment. */
export function StartingDatePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const hiringRequestId = Number(id);

  const detailQuery = useQuery({
    queryKey: ['hr-hiring-request', hiringRequestId],
    queryFn: () => hiringRequestApi.getById(hiringRequestId),
    enabled: Number.isFinite(hiringRequestId),
  });

  const submissionId = detailQuery.data?.freelanceProfileSubmissionId ?? null;
  const submissionQuery = useQuery({
    queryKey: ['hr-freelance-profile-submission', submissionId],
    queryFn: () => freelanceProfileReviewApi.getById(submissionId!),
    enabled: submissionId != null,
  });

  const departmentId = detailQuery.data?.departmentId ?? null;
  const sectionsQuery = useQuery({
    queryKey: ['hr-sections', departmentId],
    queryFn: () => hrApi.getSections(departmentId!),
    enabled: departmentId != null,
  });

  const [rawTemplateBytes, setRawTemplateBytes] = useState<Uint8Array | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [startingDate, setStartingDate] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<InteractivePdfEditorHandle>(null);
  const prefilledRef = useRef(false);

  // The role title for the new hire — taken straight from the hiring
  // request's own position title rather than re-typed here; there's no
  // separate Arabic title anywhere upstream, so none is sent.
  const jobTitleEn = detailQuery.data?.positionTitle ?? '';

  useEffect(() => {
    loadStartingDateTemplate().then(setRawTemplateBytes);
  }, []);

  // Pre-fills candidate identity, position, department, CEO approval
  // reference, and the monthly reward (if recorded) into the template's own
  // PDF fields once the hiring request (and its linked profile submission,
  // if any) have loaded — then hands the result to the editor exactly once,
  // so re-fetches from SignalR updates don't wipe out anything already typed.
  useEffect(() => {
    if (!rawTemplateBytes || prefilledRef.current || !detailQuery.data) return;
    if (submissionId != null && submissionQuery.isLoading) return;

    prefilledRef.current = true;
    const submission = submissionQuery.data;
    prefillStartingDateTemplate(rawTemplateBytes, {
      candidateName: submission?.fullNameEn || detailQuery.data.candidateName,
      qid: submission?.qid,
      mobileNumber: submission?.phoneNumber,
      department: detailQuery.data.departmentNameEn,
      positionTitle: detailQuery.data.positionTitle,
      ceoApprovalReferenceNo: detailQuery.data.ceoApprovalReferenceNo,
      monthlyReward: detailQuery.data.monthlyReward,
    }).then(setPdfBytes);
  }, [rawTemplateBytes, detailQuery.data, submissionId, submissionQuery.data, submissionQuery.isLoading]);

  const sectionName = sectionsQuery.data?.find((s) => String(s.id) === sectionId)?.nameEn ?? null;

  const handleSubmit = async () => {
    if (!startingDate || !jobTitleEn.trim()) {
      showToast('Starting date is required.', 'error');
      return;
    }
    if (!editorRef.current || !pdfBytes) return;

    setSaving(true);
    try {
      const textValues = withStartingDateSummaryFields(editorRef.current.getFieldValues(), {
        startingDateIso: startingDate,
        jobTitleEn: jobTitleEn.trim(),
        sectionName,
      });
      const checkboxValues = editorRef.current.getCheckboxValues();
      const filledPdf = await applyHiringFormValues(pdfBytes, textValues, checkboxValues);
      const file = new File([new Uint8Array(filledPdf)], 'starting-date.pdf', { type: 'application/pdf' });

      await hiringRequestApi.setStartingDate(
        hiringRequestId,
        new Date(startingDate).toISOString(),
        jobTitleEn.trim(),
        undefined,
        file
      );
      showToast('Starting date set and employee record created.', 'success');
      navigate('/hr/freelance-hiring/hiring-requests');
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to set starting date.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-border shrink-0 flex-wrap">
        <Button variant="outline" size="icon" onClick={() => navigate('/hr/freelance-hiring/hiring-requests')}>
          <ArrowLeft size={20} />
        </Button>
        <div className="min-w-0 mr-2">
          <h1 className="text-lg font-bold text-foreground truncate">
            {detailQuery.data?.candidateName ?? 'Starting Date'}
          </h1>
          <p className="text-xs text-muted-foreground">Fill the official form directly on the document, then submit.</p>
        </div>

        <div className="flex items-center gap-1.5">
          <Label htmlFor="starting-date-input" className="text-xs text-muted-foreground whitespace-nowrap">Starting Date</Label>
          <Input id="starting-date-input" type="date" className="w-36 h-9" value={startingDate} onChange={(e) => setStartingDate(e.target.value)} />
        </div>
        <Select value={sectionId} onValueChange={setSectionId}>
          <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Section" /></SelectTrigger>
          <SelectContent>
            {(sectionsQuery.data ?? []).map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>{s.nameEn}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button size="sm" className="gap-1.5 ml-auto" disabled={!pdfBytes || saving} onClick={handleSubmit}>
          <Save size={14} /> {saving ? 'Submitting…' : 'Set Starting Date'}
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {pdfBytes ? (
          <InteractivePdfEditor ref={editorRef} pdfBytes={pdfBytes} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">Loading template…</div>
        )}
      </div>
    </div>
  );
}
