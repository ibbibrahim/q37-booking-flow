import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { hiringRequestApi } from '../api/hiringRequestApi';
import { loadInterviewEvaluationTemplate, applyHiringFormValues } from '../utils/hiringFormsPdf';
import { InteractivePdfEditor, type InteractivePdfEditorHandle } from '../components/InteractivePdfEditor';
import type { InterviewRecommendation } from '../types/hiringRequest';

const RECOMMENDATION_LABELS: Record<InterviewRecommendation, string> = {
  RecommendForHire: 'Recommend For Hire',
  PracticalTest: 'Practical Test',
  NotAMatch: 'Not A Match',
  DecisionNotYetMade: 'Decision Not Yet Made',
};

/** The actual official Interview Evaluation Form template, rendered and
 * filled directly on the document — same mechanism as Contract Renewal's
 * editor. A small toolbar above it captures the handful of fields the
 * hiring workflow needs to read back programmatically (date, interviewer,
 * final %, recommendation); everything else (the 12 scored criteria,
 * comments, signature line) is filled by clicking directly on the rendered
 * PDF, since that's the actual legal record. */
export function InterviewEvaluationPage() {
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
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewerName, setInterviewerName] = useState('');
  const [finalValuePercent, setFinalValuePercent] = useState('');
  const [recommendation, setRecommendation] = useState<InterviewRecommendation | ''>('');
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<InteractivePdfEditorHandle>(null);

  useEffect(() => {
    loadInterviewEvaluationTemplate().then(setPdfBytes);
  }, []);

  const handleSubmit = async () => {
    if (!interviewDate || !interviewerName.trim() || !recommendation) {
      showToast('Interview date, interviewer name, and recommendation are required.', 'error');
      return;
    }
    if (!editorRef.current || !pdfBytes) return;

    setSaving(true);
    try {
      const textValues = editorRef.current.getFieldValues();
      const checkboxValues = editorRef.current.getCheckboxValues();
      const filledPdf = await applyHiringFormValues(pdfBytes, textValues, checkboxValues);
      const file = new File([new Uint8Array(filledPdf)], 'interview-evaluation.pdf', { type: 'application/pdf' });

      await hiringRequestApi.submitInterview(
        hiringRequestId,
        {
          interviewDate,
          interviewerName: interviewerName.trim(),
          criteriaScores: [],
          finalValuePercent: Number(finalValuePercent) || 0,
          recommendation,
        },
        file
      );
      showToast('Interview evaluation submitted.', 'success');
      navigate('/hr/freelance-hiring/hiring-requests');
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to submit interview evaluation.'), 'error');
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
            {detailQuery.data?.candidateName ?? 'Interview Evaluation'}
          </h1>
          <p className="text-xs text-muted-foreground">Fill the official form directly on the document, then submit.</p>
        </div>

        <Input type="date" className="w-36 h-9" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} title="Interview Date" />
        <Input className="w-40 h-9" placeholder="Interviewer name" value={interviewerName} onChange={(e) => setInterviewerName(e.target.value)} />
        <Input type="number" min={0} max={100} className="w-24 h-9" placeholder="Final %" value={finalValuePercent} onChange={(e) => setFinalValuePercent(e.target.value)} />
        <Select value={recommendation} onValueChange={(v) => setRecommendation(v as InterviewRecommendation)}>
          <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Recommendation" /></SelectTrigger>
          <SelectContent>
            {Object.entries(RECOMMENDATION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button size="sm" className="gap-1.5 ml-auto" disabled={!pdfBytes || saving} onClick={handleSubmit}>
          <Save size={14} /> {saving ? 'Submitting…' : 'Submit Evaluation'}
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
