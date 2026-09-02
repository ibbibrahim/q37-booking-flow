import { useQuery } from '@tanstack/react-query';
import { X, FilePlus2, Save, Eye, PenLine, CheckCircle2, Trash2, ShieldCheck, ShieldAlert, Award } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { hrApi } from '../api/hrApi';

interface Props {
  open: boolean;
  onClose: () => void;
  contractId: number;
}

const EVENT_ICON: Record<string, LucideIcon> = {
  Created: FilePlus2,
  Saved: Save,
  Viewed: Eye,
  Signed: PenLine,
  Completed: CheckCircle2,
  Discarded: Trash2,
};

const EVENT_LABEL: Record<string, string> = {
  Created: 'Contract created',
  Saved: 'Draft saved',
  Viewed: 'Document viewed',
  Signed: 'Signed',
  Completed: 'Contract completed — fully signed',
  Discarded: 'Draft discarded',
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

/** The real, insert-only lifecycle log for a contract — every Create/Save/
 * View/Sign/Complete/Discard, with who did it, from where, and exactly
 * when — DocuSign's "History" panel, backed by our own append-only audit
 * trail (hr_contract_events) rather than data derived from current state. */
export function ContractHistoryModal({ open, onClose, contractId }: Props) {
  const { showToast } = useToast();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hr-contract-audit', contractId],
    queryFn: () => hrApi.getContractAuditSummary(contractId),
    enabled: open,
  });

  const { data: integrity } = useQuery({
    queryKey: ['hr-contract-integrity', contractId],
    queryFn: () => hrApi.verifyContractIntegrity(contractId),
    enabled: open,
  });

  const handleDownloadCertificate = async () => {
    try {
      const buffer = await hrApi.getContractCertificateBytes(contractId);
      const blob = new Blob([new Uint8Array(buffer)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificate-of-Completion-${contractId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to download certificate.'), 'error');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col">
        <div className="p-5 border-b border-border flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-foreground">History</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Contract #{contractId} — full activity log</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 h-8 w-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:bg-muted"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {integrity && (
            <div
              className={
                'flex items-center gap-2.5 rounded-lg p-3 text-sm ' +
                (integrity.isValid ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')
              }
            >
              {integrity.isValid ? <ShieldCheck size={18} className="shrink-0" /> : <ShieldAlert size={18} className="shrink-0" />}
              <span>
                {integrity.isValid
                  ? 'Document integrity verified — the stored file matches its recorded tamper seal.'
                  : 'Integrity check failed — the stored file does not match its recorded tamper seal.'}
              </span>
            </div>
          )}

          {data?.contract.certificateUrl && (
            <div className="flex items-center gap-2.5 rounded-lg p-3 text-sm bg-primary/5 border border-primary/20">
              <Award size={18} className="shrink-0 text-primary" />
              <span className="flex-1">Certificate of Completion is available for this contract.</span>
              <Button size="sm" variant="outline" onClick={handleDownloadCertificate}>
                Download
              </Button>
            </div>
          )}

          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {isError && <p className="text-sm text-destructive">Failed to load history.</p>}

          {data && (
            <ul className="space-y-4">
              {data.events.map((e) => {
                const Icon = EVENT_ICON[e.eventType] ?? FilePlus2;
                return (
                  <li key={e.id} className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0 text-sm">
                      <p className="font-medium text-foreground">{EVENT_LABEL[e.eventType] ?? e.eventType}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(e.createdAt)}
                        {e.actorName ? ` · ${e.actorName}` : ''}
                        {e.ipAddress ? ` · ${e.ipAddress}` : ''}
                      </p>
                    </div>
                  </li>
                );
              })}
              {data.events.length === 0 && (
                <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
