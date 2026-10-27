import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { hiringRequestApi } from '../api/hiringRequestApi';
import {
  applyHiringFormValues, calculateInterviewScorePercent, getCheckedRecommendation, withInterviewSummaryFields,
  CRITERIA_CHECKBOX_GROUPS, RECOMMENDATION_CHECKBOX_GROUP, INTERVIEW_SIGNATURE_ROWS, stampInterviewerSignature,
} from '../utils/hiringFormsPdf';
import { InteractivePdfEditor, type InteractivePdfEditorHandle } from '../components/InteractivePdfEditor';
import { SignaturePad } from '../components/SignaturePad';
import type { InterviewRecommendation } from '../types/hiringRequest';

const RECOMMENDATION_LABELS: Record<InterviewRecommendation, string> = {
  RecommendForHire: 'Recommend For Hire',
  PracticalTest: 'Practical Test',
  NotAMatch: 'Not A Match',
  DecisionNotYetMade: 'Decision Not Yet Made',
};

/** Department Head's review of the Coordinator's already-submitted interview
 * evaluation — loads the actual working PDF (criteria checked, interviewer
 * signatures baked in) instead of a blank template, so they're reviewing the
 * real document, not starting over. Everything stays editable: fields,
 * criteria checkboxes (Final Value % recalculates live), and they can add
 * their own signature in any still-blank Interviewer row before submitting.
 * This doesn't move the hiring request's status and doesn't block GM
 * approval — it's a side track, same as the Starting Date signature chain. */
export function InterviewManagerReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const hiringRequestId = Number(id);

  const detailQuery = useQuery({
    queryKey: ['hr-hiring-request', hiringRequestId],
    queryFn: () => hiringRequestApi.getById(hiringRequestId),
    enabled: Number.isFinite(hiringRequestId),
  });

  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [interviewDate, setInterviewDate] = useState('');
  const [scorePercent, setScorePercent] = useState(0);
  // Derived from the document's own recommendation checkboxes — see
  // getCheckedRecommendation. Seeded once from whatever the Coordinator
  // already had checked, then stays in sync as the Department Head edits.
  const [recommendation, setRecommendation] = useState<InterviewRecommendation | null>(null);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<InteractivePdfEditorHandle>(null);
  const loadedRef = useRef(false);

  const [signingRowIndex, setSigningRowIndex] = useState<number | null>(null);
  const [signing, setSigning] = useState(false);

  // Loads the real submitted PDF (not a template) once the detail record is
  // in, and seeds the toolbar date from what the Coordinator already
  // submitted so the Department Head sees the actual prior value, not blank.
  useEffect(() => {
    if (loadedRef.current || !detailQuery.data) return;
    if (detailQuery.data.status !== 'InterviewSubmitted') return;
    loadedRef.current = true;

    if (detailQuery.data.interviewDate) setInterviewDate(detailQuery.data.interviewDate.slice(0, 10));
    if (detailQuery.data.interviewRecommendation) setRecommendation(detailQuery.data.interviewRecommendation);

    hiringRequestApi.getInterviewPdfBytes(hiringRequestId).then((buf) => setPdfBytes(new Uint8Array(buf)));
  }, [detailQuery.data, hiringRequestId]);

  const handleInterviewerSign = async (blob: Blob) => {
    if (signingRowIndex === null || !pdfBytes || !editorRef.current) return;
    const rowIndex = signingRowIndex;
    setSigning(true);
    try {
      const textValues = editorRef.current.getFieldValues();
      const checkboxValues = editorRef.current.getCheckboxValues();
      const withLiveValues = await applyHiringFormValues(pdfBytes, textValues, checkboxValues, false);
      const imageBytes = new Uint8Array(await blob.arrayBuffer());
      const stamped = await stampInterviewerSignature(withLiveValues, rowIndex, imageBytes, 'png');
      setPdfBytes(stamped);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to sign.'), 'error');
    } finally {
      setSigning(false);
      setSigningRowIndex(null);
    }
  };

  const handleSubmit = async () => {
    if (!interviewDate) {
      showToast('Interview date is required.', 'error');
      return;
    }
    if (!recommendation) {
      showToast('Check one of the recommendation boxes on the document before submitting.', 'error');
      return;
    }
    if (!editorRef.current || !pdfBytes) return;

    setSaving(true);
    try {
      const textValues = withInterviewSummaryFields(editorRef.current.getFieldValues(), {
        interviewDateIso: interviewDate,
        finalValuePercent: scorePercent,
      });
      const checkboxValues = editorRef.current.getCheckboxValues();
      const filledPdf = await applyHiringFormValues(pdfBytes, textValues, checkboxValues);
      const file = new Blob([new Uint8Array(filledPdf)], { type: 'application/pdf' });

      await hiringRequestApi.managerReviewInterview(
        hiringRequestId,
        {
          interviewDate,
          // Who submitted this review — the actual interviewer(s)' identity/
          // signature is captured on the document's own rows, not here.
          interviewerName: user?.displayName || user?.username || 'Department Head',
          criteriaScores: [],
          finalValuePercent: scorePercent,
          recommendation,
        },
        file
      );
      showToast('Interview evaluation reviewed and signed.', 'success');
      navigate('/hr/department-approvals');
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to submit review.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (detailQuery.isSuccess && detailQuery.data.status !== 'InterviewSubmitted') {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        This request isn't awaiting an interview review (status: {detailQuery.data.status}).
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-border shrink-0 flex-wrap">
        <Button variant="outline" size="icon" onClick={() => navigate('/hr/department-approvals')}>
          <ArrowLeft size={20} />
        </Button>
        <div className="min-w-0 mr-2">
          <h1 className="text-lg font-bold text-foreground truncate">
            {detailQuery.data?.candidateName ?? 'Review Interview Evaluation'}
          </h1>
          <p className="text-xs text-muted-foreground">
            Edit any field or score if needed, add your signature in a blank row, then submit your review.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <Label htmlFor="interview-date" className="text-xs text-muted-foreground whitespace-nowrap">Interview Date</Label>
          <Input
            id="interview-date"
            type="date"
            className="w-36 h-9"
            value={interviewDate}
            onChange={(e) => setInterviewDate(e.target.value)}
          />
        </div>
        <div
          className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-muted text-sm shrink-0"
          title="Calculated from the 12 scored criteria checked on the document (Total Score / 60 × 100)"
        >
          <span className="text-muted-foreground">Final Value:</span>
          <span className="font-bold text-foreground tabular-nums">{scorePercent}%</span>
        </div>
        <div
          className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-muted text-sm shrink-0"
          title="Whichever box is checked in the document's Overall Impression and Recommendation row"
        >
          <span className="text-muted-foreground">Recommendation:</span>
          <span className="font-bold text-foreground">{recommendation ? RECOMMENDATION_LABELS[recommendation] : '—'}</span>
        </div>

        <Button size="sm" className="gap-1.5 ml-auto" disabled={!pdfBytes || saving} onClick={handleSubmit}>
          <Save size={14} /> {saving ? 'Submitting…' : 'Submit Review'}
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {pdfBytes ? (
          <InteractivePdfEditor
            ref={editorRef}
            pdfBytes={pdfBytes}
            checkboxGroups={[...CRITERIA_CHECKBOX_GROUPS, RECOMMENDATION_CHECKBOX_GROUP]}
            onCheckboxChange={(values) => {
              setScorePercent(calculateInterviewScorePercent(values));
              setRecommendation(getCheckedRecommendation(values));
            }}
            signatureSlots={INTERVIEW_SIGNATURE_ROWS.map((rect, i) => ({ id: String(i), page: 1, rect, label: '+ Sign' }))}
            onSignSlotClick={(id) => setSigningRowIndex(Number(id))}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">Loading document…</div>
        )}
      </div>

      <SignaturePad
        open={signingRowIndex !== null}
        onCancel={() => setSigningRowIndex(null)}
        onConfirm={(blob) => handleInterviewerSign(blob)}
      />
      {signing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}
    </div>
  );
}
