import { useState } from 'react';
import { X, UploadCloud, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { hrApi } from '../api/hrApi';
import type { HrContractUploadVerification } from '../types/hrApi';

interface Props {
  open: boolean;
  onClose: () => void;
  contractId: number;
}

/** Testing/validation utility: lets someone upload a PDF (e.g. one they
 * downloaded, edited, and saved back) and checks its hash against the
 * contract's trusted hash on record — a hands-on way to demonstrate that
 * the tamper seal actually catches an altered document. */
export function ContractVerifyUploadModal({ open, onClose, contractId }: Props) {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<HrContractUploadVerification | null>(null);

  if (!open) return null;

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  const handleVerify = async () => {
    if (!file) return;
    setVerifying(true);
    setResult(null);
    try {
      const outcome = await hrApi.verifyUploadedContractPdf(contractId, file);
      setResult(outcome);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to verify document.'), 'error');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md flex flex-col">
        <div className="p-5 border-b border-border flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-foreground">Verify Document</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Upload a PDF to check it against contract #{contractId}'s record on file.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="shrink-0 h-8 w-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:bg-muted"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg py-8 px-4 cursor-pointer hover:bg-muted/40 text-center">
            <UploadCloud size={22} className="text-muted-foreground" />
            <span className="text-sm text-foreground font-medium">
              {file ? file.name : 'Click to choose a PDF'}
            </span>
            {!file && <span className="text-xs text-muted-foreground">Only .pdf files are accepted</span>}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                setResult(null);
                setFile(e.target.files?.[0] ?? null);
              }}
            />
          </label>

          {result && (
            <div
              className={
                'flex items-start gap-2.5 rounded-lg p-3 text-sm ' +
                (result.isValid ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')
              }
            >
              {result.isValid ? <ShieldCheck size={18} className="shrink-0 mt-0.5" /> : <ShieldAlert size={18} className="shrink-0 mt-0.5" />}
              <div className="space-y-1">
                <p className="font-medium">{result.message}</p>
                <p className="text-xs opacity-80 font-mono break-all">Expected: {result.expectedHash ?? '—'}</p>
                <p className="text-xs opacity-80 font-mono break-all">Uploaded: {result.actualHash}</p>
              </div>
            </div>
          )}

          <Button className="w-full gap-1.5" disabled={!file || verifying} onClick={handleVerify}>
            {verifying ? 'Verifying…' : 'Verify'}
          </Button>
        </div>
      </div>
    </div>
  );
}
