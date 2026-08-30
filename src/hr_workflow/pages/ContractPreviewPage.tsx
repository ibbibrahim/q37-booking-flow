import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Save, CheckCircle2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { hrApi } from '../api/hrApi';
import { fillContractTemplate, applyCoordinatorFields, stampSignaturesAtPositions } from '../utils/contractPdf';
import { InteractivePdfEditor, type InteractivePdfEditorHandle } from '../components/InteractivePdfEditor';
import { SignaturePlacementEditor, type SignaturePlacementEditorHandle } from '../components/SignaturePlacementEditor';
import { useHrLanguage, bilingual } from '../context/HrLanguageContext';
import type { HrContract } from '../types/hrApi';

type Phase = 'loading' | 'editing' | 'signing' | 'viewing';

const STATUS_SUBTITLE: Record<string, string> = {
  AwaitingEmployeeSignature: 'Draft contract — read-only preview.',
  AwaitingDepartmentHeadSignature: 'Signed — sent to Department Head for signature.',
  AwaitingFinalSignature: 'Awaiting GM signature.',
  Completed: 'Contract completed and fully signed.',
  Returned: 'This contract was returned.',
};

export function ContractPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // ?mode=view forces a read-only preview even for an in-progress draft
  // (the list page's "View" action); ?mode=new always starts a brand-new
  // contract cycle instead of resuming the most recent one (the list page's
  // "Start New Renewal" action, for a Completed/Returned contract).
  // ?mode=sign (the list page's "Send for Signature" action) jumps straight
  // into the signing surface instead of the editor.
  const mode = searchParams.get('mode');
  const { language, t } = useHrLanguage();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const employeeId = Number(id);

  // The Contract Renewal list's status column reads this same data under a
  // 60s default staleTime — without invalidating it here, going back after
  // creating/saving/signing a contract shows the pre-change status until
  // that window passes or the page is manually refreshed.
  const invalidateContractsList = () => {
    queryClient.invalidateQueries({ queryKey: ['hr-contracts-by-employees'] });
  };

  const [phase, setPhase] = useState<Phase>('loading');
  const [currentBytes, setCurrentBytes] = useState<Uint8Array | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [completingSign, setCompletingSign] = useState(false);
  const [signedCount, setSignedCount] = useState(0);
  const objectUrlRef = useRef<string | null>(null);
  const editorRef = useRef<InteractivePdfEditorHandle>(null);
  const signatureEditorRef = useRef<SignaturePlacementEditorHandle>(null);

  const [contractId, setContractId] = useState<number | null>(null);
  const [statusContract, setStatusContract] = useState<HrContract | null>(null);

  const { data: employee, isLoading } = useQuery({
    queryKey: ['hr-employee', employeeId],
    queryFn: () => hrApi.getEmployee(employeeId),
    enabled: Number.isFinite(employeeId),
  });

  const showPdf = (bytes: Uint8Array) => {
    const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = url;
    setPdfUrl(url);
  };

  useEffect(() => {
    if (!employee) return;
    let cancelled = false;

    (async () => {
      try {
        // mode=new (list page's "Start New Renewal") always begins a fresh
        // contract cycle, skipping the resume check entirely — used once a
        // prior contract is Completed/Returned and shouldn't be reopened.
        if (mode !== 'new') {
          const existing = await hrApi.getLatestContractForEmployee(employee.id);

          if (existing) {
            const buffer = await hrApi.getContractPdfBytes(existing.id);
            if (cancelled) return;
            const bytes = new Uint8Array(buffer);
            setContractId(existing.id);
            setCurrentBytes(bytes);
            showPdf(bytes);
            setStatusContract(existing);

            if (existing.status === 'AwaitingEmployeeSignature' && mode === 'sign') {
              // Coordinator already finished editing — jump straight to the
              // employee signing surface.
              setPhase('signing');
            } else if (existing.status === 'AwaitingEmployeeSignature' && mode !== 'view') {
              // Resume exactly where the coordinator left off.
              setPhase('editing');
            } else {
              // Either past the coordinator's stage already, or the list
              // page explicitly asked for a read-only preview — either way,
              // no editor, just the document and the status tracker.
              setPhase('viewing');
            }
            return;
          }
        }

        // No existing contract (or mode=new) — generate the auto-filled
        // template client-side and let the coordinator start editing. This
        // is deliberately NOT persisted yet: nothing should exist on the
        // backend, and the list page's status should stay "Not started",
        // until the coordinator actually clicks Save for the first time.
        const bytes = await fillContractTemplate(employee);
        if (cancelled) return;
        setContractId(null);
        setStatusContract(null);
        setCurrentBytes(bytes);
        showPdf(bytes);
        setPhase('editing');
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load contract.');
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee, mode]);

  // The very first Save is what actually persists the contract — creating
  // the record here (rather than the moment the page opens) is deliberate,
  // so simply opening "Renew Contract" and navigating away never leaves a
  // draft behind on the backend. Every Save after that just updates it.
  const saveWorkingCopy = async (): Promise<Uint8Array | null> => {
    if (!currentBytes || !employee || !editorRef.current) return null;
    const values = editorRef.current.getFieldValues();
    const updatedBytes = await applyCoordinatorFields(currentBytes, values);
    const blob = new Blob([new Uint8Array(updatedBytes)], { type: 'application/pdf' });

    const contract = contractId
      ? await hrApi.updateContract(contractId, blob)
      : await hrApi.createContract(employee.id, blob);

    setContractId(contract.id);
    setStatusContract(contract);
    setCurrentBytes(updatedBytes);
    showPdf(updatedBytes);
    invalidateContractsList();
    return updatedBytes;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await saveWorkingCopy();
      if (updated) showToast('Contract saved.', 'success');
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to save contract.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteSigning = async () => {
    if (!currentBytes || !contractId || !employee || !signatureEditorRef.current) return;
    setCompletingSign(true);
    try {
      const placements = await signatureEditorRef.current.getSignedPlacements();
      if (placements.length === 0) {
        showToast('Drop and sign at least one signature tag first.', 'error');
        return;
      }

      const method = signatureEditorRef.current.getSignatureMethod();
      const signedBytes = await stampSignaturesAtPositions(currentBytes, placements, employee);
      const blob = new Blob([new Uint8Array(signedBytes)], { type: 'application/pdf' });

      const updatedContract = await hrApi.signContract(contractId, blob, 'Employee', employee.fullNameEn, method);
      setCurrentBytes(signedBytes);
      showPdf(signedBytes);
      setStatusContract(updatedContract);
      setPhase('viewing');
      invalidateContractsList();
      showToast('Contract signed.', 'success');
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to complete signing.'), 'error');
    } finally {
      setCompletingSign(false);
    }
  };

  const subtitle =
    phase === 'editing'
      ? 'Fill in the remaining fields directly on the document, then save.'
      : phase === 'signing'
      ? 'Drag a Signature tag onto the document, then click it to sign.'
      : phase === 'viewing'
      ? STATUS_SUBTITLE[statusContract?.status ?? ''] ?? 'Read-only preview.'
      : 'Loading contract…';

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-border shrink-0 flex-wrap">
        <Button variant="outline" size="icon" onClick={() => navigate('/hr/freelance-hiring/contract-renewal')}>
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">
            {employee ? bilingual(language, employee.fullNameEn, employee.fullNameAr) : t('contractRenewal')}
          </h1>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>

        {pdfUrl && (
          <a href={pdfUrl} download={`${employee?.fullNameEn ?? 'contract'}.pdf`}>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Download size={14} /> {t('download')}
            </Button>
          </a>
        )}

        {phase === 'editing' && (
          <Button size="sm" className="gap-1.5" disabled={!currentBytes || saving} onClick={handleSave}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save'}
          </Button>
        )}

        {phase === 'signing' && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="outline" onClick={() => setPhase('editing')} aria-label="Back to editing">
                  <Undo2 size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Back to Editing</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  disabled={signedCount === 0 || completingSign}
                  onClick={handleCompleteSigning}
                  aria-label="Complete signing"
                >
                  <CheckCircle2 size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {completingSign
                  ? 'Completing…'
                  : signedCount === 0
                  ? 'Drag your signature onto the document first'
                  : 'Complete Signing'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-full text-muted-foreground">{t('loading')}</div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full text-destructive">{error}</div>
        )}

        {phase === 'editing' && currentBytes && !error && (
          <InteractivePdfEditor ref={editorRef} pdfBytes={currentBytes} />
        )}

        {phase === 'signing' && currentBytes && !error && (
          <SignaturePlacementEditor
            ref={signatureEditorRef}
            pdfBytes={currentBytes}
            defaultSignerName={employee?.fullNameEn}
            onSignedCountChange={setSignedCount}
          />
        )}

        {phase === 'viewing' && pdfUrl && !error && (
          // <embed>, not <iframe> — an iframe is its own browsing context, so
          // changing its src pushes a browser history entry, which then
          // intercepts the "Back" button. <embed> doesn't have this problem.
          // Fine to use here since this view is read-only — no live typing
          // to capture, unlike the editing phase above.
          <embed src={pdfUrl} type="application/pdf" className="w-full h-full" />
        )}
      </div>
    </div>
  );
}
