import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, PenLine, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { hrApi } from '../api/hrApi';
import { fillContractTemplate, stampEmployeeSignature } from '../utils/contractPdf';
import { SignaturePad } from '../components/SignaturePad';
import { useHrLanguage, bilingual } from '../context/HrLanguageContext';
import type { HrSignatureMethod } from '../types/hrApi';

export function ContractPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language, t } = useHrLanguage();
  const { showToast } = useToast();
  const employeeId = Number(id);

  const [unsignedBytes, setUnsignedBytes] = useState<Uint8Array | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [contractId, setContractId] = useState<number | null>(null);
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [signing, setSigning] = useState(false);
  const [completed, setCompleted] = useState(false);

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

    fillContractTemplate(employee)
      .then(async (bytes) => {
        if (cancelled) return;
        setUnsignedBytes(bytes);
        showPdf(bytes);

        // Persist the working copy as soon as it's ready — this is what the
        // "awaiting employee signature" record the Department Head will
        // eventually see is based on.
        const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
        const contract = await hrApi.createContract(employeeId, blob);
        if (!cancelled) setContractId(contract.id);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to generate contract preview.');
      });

    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee]);

  const handleSignConfirm = async (signatureBlob: Blob, method: HrSignatureMethod) => {
    if (!employee || !unsignedBytes || !contractId) return;
    setSigning(true);
    try {
      const signatureBytes = new Uint8Array(await signatureBlob.arrayBuffer());
      const imageType = signatureBlob.type === 'image/jpeg' ? 'jpeg' : 'png';

      const signedBytes = await stampEmployeeSignature(unsignedBytes, signatureBytes, imageType, employee);
      showPdf(signedBytes);

      const signedBlob = new Blob([new Uint8Array(signedBytes)], { type: 'application/pdf' });
      await hrApi.signContract(contractId, signedBlob, 'Employee', employee.fullNameEn, method);

      setSignModalOpen(false);
      setCompleted(true);
      showToast(t('signAndComplete'), 'success');
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to save signature.'), 'error');
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">
            {employee ? bilingual(language, employee.fullNameEn, employee.fullNameAr) : t('contractRenewal')}
          </h1>
          <p className="text-xs text-muted-foreground">
            {completed
              ? 'Signed — sent to Department Head for signature.'
              : 'Contract preview — auto-filled from employee record, review before signing.'}
          </p>
        </div>

        {pdfUrl && (
          <a href={pdfUrl} download="contract-preview.pdf">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Download size={14} /> {t('download')}
            </Button>
          </a>
        )}

        {pdfUrl && !completed && (
          <Button size="sm" className="gap-1.5" disabled={!contractId} onClick={() => setSignModalOpen(true)}>
            <PenLine size={14} /> {t('signContract')}
          </Button>
        )}

        {completed && (
          <div className="flex items-center gap-1.5 text-success text-sm font-medium">
            <CheckCircle2 size={16} /> {t('signAndComplete')}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0">
        {isLoading && (
          <div className="flex items-center justify-center h-full text-muted-foreground">{t('loading')}</div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full text-destructive">{error}</div>
        )}
        {pdfUrl && !error && (
          <iframe src={pdfUrl} title="Contract preview" className="w-full h-full border-0" />
        )}
      </div>

      <SignaturePad
        open={signModalOpen}
        defaultName={employee?.fullNameEn}
        onCancel={() => setSignModalOpen(false)}
        onConfirm={handleSignConfirm}
      />
      {signing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center">
          <div className="bg-card p-6 rounded-lg shadow-lg border text-sm text-muted-foreground">{t('scanning')}</div>
        </div>
      )}
    </div>
  );
}
