import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { hiringRequestApi } from '../api/hiringRequestApi';
import { freelanceProfileReviewApi } from '../api/freelanceProfileApi';
import {
  loadInterviewEvaluationTemplate, applyHiringFormValues, prefillInterviewEvaluationTemplate,
  calculateInterviewScorePercent, getCheckedRecommendation, withInterviewSummaryFields, CRITERIA_CHECKBOX_GROUPS,
  RECOMMENDATION_CHECKBOX_GROUP, INTERVIEW_SIGNATURE_ROWS, stampInterviewerSignature,
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

/** The actual official Interview Evaluation Form template, rendered and
 * filled directly on the document — same mechanism as Contract Renewal's
 * editor. Interviewer name/signature, the 12 scored criteria, and the
 * recommendation are all captured directly on the document itself (that's
 * the actual legal record); the toolbar only surfaces what the hiring
 * workflow needs to read back programmatically (date, final %), reading the
 * rest straight off the PDF's own fields/checkboxes rather than duplicating
 * them as separate inputs. */
export function InterviewEvaluationPage() {
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

  const submissionId = detailQuery.data?.freelanceProfileSubmissionId ?? null;
  const submissionQuery = useQuery({
    queryKey: ['hr-freelance-profile-submission', submissionId],
    queryFn: () => freelanceProfileReviewApi.getById(submissionId!),
    enabled: submissionId != null,
  });

  const [rawTemplateBytes, setRawTemplateBytes] = useState<Uint8Array | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [interviewDate, setInterviewDate] = useState('');
  // Derived from the 12 scored criteria checkboxes as the interviewer checks
  // them on the document itself — see calculateInterviewScorePercent.
  const [scorePercent, setScorePercent] = useState(0);
  // Derived from the document's own "Overall Impression and Recommendation"
  // checkboxes — see getCheckedRecommendation. Null until one is checked.
  const [recommendation, setRecommendation] = useState<InterviewRecommendation | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const editorRef = useRef<InteractivePdfEditorHandle>(null);
  const prefilledRef = useRef(false);

  // Team-member (interviewer) in-person signing, same session as the
  // Coordinator filling the form — one of the 4 blank Interviewer rows per
  // signer. `signingRowIndex` is which row the pad is currently open for.
  // Rows that already have ink get their "+ Sign" prompt auto-hidden by
  // InteractivePdfEditor itself (see its own ink-detection), so no manual
  // "which rows are signed" bookkeeping is needed here.
  const [signingRowIndex, setSigningRowIndex] = useState<number | null>(null);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    loadInterviewEvaluationTemplate().then(setRawTemplateBytes);
  }, []);

  // Pre-fills candidate identity + position/department into the template's
  // own PDF fields as soon as the hiring request (and its linked profile
  // submission, if any) have loaded — then hands the result to the editor
  // exactly once, so re-fetches from SignalR updates don't wipe out
  // whatever the interviewer has since typed on the document.
  useEffect(() => {
    if (!rawTemplateBytes || prefilledRef.current || !detailQuery.data) return;
    if (submissionId != null && submissionQuery.isLoading) return;

    prefilledRef.current = true;
    const submission = submissionQuery.data;
    prefillInterviewEvaluationTemplate(rawTemplateBytes, {
      // The candidate's own submitted name, not the name the Coordinator
      // typed when requesting the link — falls back to that only if the
      // candidate hasn't actually submitted a profile yet.
      candidateName: submission?.fullNameEn || detailQuery.data.candidateName,
      positionApplied: detailQuery.data.positionTitle,
      department: detailQuery.data.departmentNameEn,
      nationality: submission?.nationality,
      dob: submission?.dob,
      mobileNumber: submission?.phoneNumber,
      email: submission?.personalEmail,
    }).then(setPdfBytes);
  }, [rawTemplateBytes, detailQuery.data, submissionId, submissionQuery.data, submissionQuery.isLoading]);

  // Re-bakes whatever's currently typed/checked (without flattening, so the
  // result is still editable) before stamping, then swaps in the signed PDF
  // as the new working copy — otherwise replacing pdfBytes would reset the
  // editor back to the last-prefilled state and lose anything typed since.
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

  const handleSubmitClick = () => {
    if (!interviewDate) {
      showToast('Interview date is required.', 'error');
      return;
    }
    if (!recommendation) {
      showToast('Check one of the recommendation boxes on the document before submitting.', 'error');
      return;
    }
    if (!editorRef.current || !pdfBytes) return;
    setConfirmSubmitOpen(true);
  };

  const handleSubmit = async () => {
    if (!editorRef.current || !pdfBytes) return;

    setSaving(true);
    try {
      const textValues = withInterviewSummaryFields(editorRef.current.getFieldValues(), {
        interviewDateIso: interviewDate,
        finalValuePercent: scorePercent,
      });
      const checkboxValues = editorRef.current.getCheckboxValues();
      // Not flattened: the Department Head's review step needs the criteria
      // checkboxes and fields to still be live, editable widgets when they
      // load this same PDF back, not static marks baked into the page image.
      const filledPdf = await applyHiringFormValues(pdfBytes, textValues, checkboxValues, false);
      const file = new File([new Uint8Array(filledPdf)], 'interview-evaluation.pdf', { type: 'application/pdf' });

      await hiringRequestApi.submitInterview(
        hiringRequestId,
        {
          interviewDate,
          // Who submitted this online record — the actual interviewer(s)'
          // identity/signature is captured on the document's own
          // Interviewer Name/Signature rows, not here.
          interviewerName: user?.displayName || user?.username || 'HR',
          criteriaScores: [],
          finalValuePercent: scorePercent,
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
          <p className="text-xs text-muted-foreground">
            Fill the official form directly on the document — including each interviewer's signature — then submit.
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

        <Button size="sm" className="gap-1.5 ml-auto" disabled={!pdfBytes || saving} onClick={handleSubmitClick}>
          <Save size={14} /> {saving ? 'Submitting…' : 'Submit Evaluation'}
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
          <div className="flex items-center justify-center h-full text-muted-foreground">Loading template…</div>
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

      <AlertDialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
        <AlertDialogContent className="sm:max-w-[420px]">
          <AlertDialogHeader className="flex-row items-start gap-3.5 text-left">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-primary/5">
              <Save size={19} strokeWidth={2.25} />
            </div>
            <div className="space-y-1.5 pt-0.5">
              <AlertDialogTitle>Submit this interview evaluation?</AlertDialogTitle>
              <AlertDialogDescription>
                Final Value {scorePercent}% · Recommendation: {recommendation ? RECOMMENDATION_LABELS[recommendation] : '—'}.
                Once submitted, this moves the request forward for GM/CEO approval.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              className="gap-1.5"
              onClick={() => {
                setConfirmSubmitOpen(false);
                handleSubmit();
              }}
            >
              <Save size={14} /> Submit Evaluation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
