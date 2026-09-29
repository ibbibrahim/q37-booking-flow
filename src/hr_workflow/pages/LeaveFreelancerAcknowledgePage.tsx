import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { leaveRequestApi } from '../api/leaveRequestApi';
import { stampFreelancerSignature } from '../utils/leaveSuspensionPdf';
import { SignaturePad } from '../components/SignaturePad';

/** The freelancer comes to the coordinator in person and signs on-screen —
 * same acknowledgment-of-receipt idea as the employee-signing stage of
 * Contract Renewal, but stamped automatically at the one fixed signature
 * line this document has (no manual placement needed). */
export function LeaveFreelancerAcknowledgePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const leaveRequestId = Number(id);

  const detailQuery = useQuery({
    queryKey: ['hr-leave-request', leaveRequestId],
    queryFn: () => leaveRequestApi.getById(leaveRequestId),
    enabled: Number.isFinite(leaveRequestId),
  });
  const detail = detailQuery.data;

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [padOpen, setPadOpen] = useState(false);
  const [signing, setSigning] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!detail) return;
    (async () => {
      const buffer = await leaveRequestApi.getPdfBytes(detail.id);
      const blob = new Blob([new Uint8Array(buffer)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = url;
      setPdfUrl(url);
    })();
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, [detail]);

  const handleSign = async (blob: Blob, method: string) => {
    if (!detail) return;
    setSigning(true);
    try {
      const buffer = await leaveRequestApi.getPdfBytes(detail.id);
      const imageBytes = new Uint8Array(await blob.arrayBuffer());
      const { bytes: signed, verificationId } = await stampFreelancerSignature(new Uint8Array(buffer), imageBytes, 'png');
      const signedBlob = new Blob([new Uint8Array(signed)], { type: 'application/pdf' });

      await leaveRequestApi.freelancerAcknowledge(
        detail.id, signedBlob, detail.employeeFullNameEn ?? 'Freelancer', verificationId,
        { bytes: imageBytes, type: 'png' }
      );

      queryClient.invalidateQueries({ queryKey: ['hr-leave-requests'] });
      showToast('Acknowledged and signed.', 'success');
      navigate('/hr/leave-requests');
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to sign.'), 'error');
    } finally {
      setSigning(false);
      setPadOpen(false);
    }
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
        <Button variant="outline" size="icon" onClick={() => navigate('/hr/leave-requests')}>
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">{detail?.employeeFullNameEn ?? 'Leave Request'}</h1>
          <p className="text-xs text-muted-foreground">Have the freelancer review this notice, then sign below to acknowledge receipt.</p>
        </div>
        <Button size="sm" className="gap-1.5" disabled={!pdfUrl || signing} onClick={() => setPadOpen(true)}>
          <PenTool size={14} /> {signing ? 'Signing…' : 'Sign'}
        </Button>
      </div>

      <div className="flex-1 min-h-0">
        {pdfUrl ? (
          <embed src={pdfUrl} type="application/pdf" className="w-full h-full" />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">Loading…</div>
        )}
      </div>

      <SignaturePad
        open={padOpen}
        defaultName={detail?.employeeFullNameEn ?? undefined}
        onCancel={() => setPadOpen(false)}
        onConfirm={handleSign}
      />
    </div>
  );
}
