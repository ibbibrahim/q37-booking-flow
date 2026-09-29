import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { hiringRequestApi } from '../api/hiringRequestApi';
import { loadStartingDateTemplate, applyHiringFormValues } from '../utils/hiringFormsPdf';
import { InteractivePdfEditor, type InteractivePdfEditorHandle } from '../components/InteractivePdfEditor';

/** The actual official "Acknowledgement of Starting Work First Time" PDF
 * template, filled directly on the document — same pattern as the Interview
 * Evaluation editor and Contract Renewal. The toolbar captures the fields
 * the hiring workflow needs back (starting date, job title, used to create
 * the hr_employees record); the rest (department/employee approval blocks,
 * attachments checklist) is filled directly on the rendered PDF. */
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

  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [startingDate, setStartingDate] = useState('');
  const [jobTitleEn, setJobTitleEn] = useState('');
  const [jobTitleAr, setJobTitleAr] = useState('');
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<InteractivePdfEditorHandle>(null);

  useEffect(() => {
    loadStartingDateTemplate().then(setPdfBytes);
  }, []);

  useEffect(() => {
    if (detailQuery.data?.positionTitle && !jobTitleEn) setJobTitleEn(detailQuery.data.positionTitle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailQuery.data]);

  const handleSubmit = async () => {
    if (!startingDate || !jobTitleEn.trim()) {
      showToast('Starting date and job title are required.', 'error');
      return;
    }
    if (!editorRef.current || !pdfBytes) return;

    setSaving(true);
    try {
      const textValues = editorRef.current.getFieldValues();
      const checkboxValues = editorRef.current.getCheckboxValues();
      const filledPdf = await applyHiringFormValues(pdfBytes, textValues, checkboxValues);
      const file = new File([new Uint8Array(filledPdf)], 'starting-date.pdf', { type: 'application/pdf' });

      await hiringRequestApi.setStartingDate(
        hiringRequestId,
        new Date(startingDate).toISOString(),
        jobTitleEn.trim(),
        jobTitleAr.trim() || undefined,
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

        <Input type="date" className="w-36 h-9" value={startingDate} onChange={(e) => setStartingDate(e.target.value)} title="Starting Date" />
        <Input className="w-40 h-9" placeholder="Job title (EN)" value={jobTitleEn} onChange={(e) => setJobTitleEn(e.target.value)} />
        <Input className="w-40 h-9" placeholder="Job title (AR, optional)" value={jobTitleAr} onChange={(e) => setJobTitleAr(e.target.value)} />

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
