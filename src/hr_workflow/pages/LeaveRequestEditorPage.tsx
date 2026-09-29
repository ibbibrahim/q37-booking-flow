import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { leaveRequestApi } from '../api/leaveRequestApi';
import { applyLeaveFields } from '../utils/leaveSuspensionPdf';
import { InteractivePdfEditor, type InteractivePdfEditorHandle } from '../components/InteractivePdfEditor';
import { LEAVE_REQUEST_STATUS_LABELS } from '../types/leaveRequest';
import type { SuspensionType } from '../types/leaveRequest';

function daysBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

/** Draft-phase editor: same "fill directly on the real document" UX as
 * Contract Renewal, plus a small toolbar for the handful of fields the
 * workflow needs back as structured data (reference no, dates, type,
 * reason). Once submitted, this becomes a read-only preview — the
 * Department Head then signs from the Manager Approval screen, and the
 * freelancer acknowledges from a separate dedicated page. */
export function LeaveRequestEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const leaveRequestId = Number(id);
  const editorRef = useRef<InteractivePdfEditorHandle>(null);

  const detailQuery = useQuery({
    queryKey: ['hr-leave-request', leaveRequestId],
    queryFn: () => leaveRequestApi.getById(leaveRequestId),
    enabled: Number.isFinite(leaveRequestId),
  });
  const detail = detailQuery.data;

  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [noticeReferenceNo, setNoticeReferenceNo] = useState('');
  const [dateOfNotice, setDateOfNotice] = useState('');
  const [suspensionType, setSuspensionType] = useState<SuspensionType | ''>('');
  const [partialScope, setPartialScope] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!detail) return;
    (async () => {
      const buffer = await leaveRequestApi.getPdfBytes(detail.id);
      setPdfBytes(new Uint8Array(buffer));
    })();
    setNoticeReferenceNo(detail.noticeReferenceNo ?? '');
    setDateOfNotice(detail.dateOfNotice ? detail.dateOfNotice.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setSuspensionType((detail.suspensionType as SuspensionType) ?? '');
    setPartialScope(detail.partialScope ?? '');
    setStartDate(detail.startDate ? detail.startDate.slice(0, 10) : '');
    setEndDate(detail.endDate ? detail.endDate.slice(0, 10) : '');
    setReason(detail.reason ?? '');
  }, [detail]);

  const totalDays = startDate && endDate ? daysBetween(startDate, endDate) : null;
  const isDraft = detail?.status === 'Draft';

  const buildFilledPdf = async (): Promise<Uint8Array | null> => {
    if (!editorRef.current || !pdfBytes) return null;
    const textValues = { ...editorRef.current.getFieldValues() };
    const checkboxValues = { ...editorRef.current.getCheckboxValues() };

    textValues.notice_reference_no = noticeReferenceNo;
    textValues.date_of_notice = dateOfNotice;
    textValues.suspension_partial_scope = suspensionType === 'Partial' ? partialScope : '';
    textValues.suspension_start_date = startDate;
    textValues.suspension_end_date = endDate;
    textValues.suspension_total_days = totalDays != null ? String(totalDays) : '';
    textValues.suspension_reason = reason;
    checkboxValues.suspension_type_full = suspensionType === 'Full';
    checkboxValues.suspension_type_partial = suspensionType === 'Partial';

    return applyLeaveFields(pdfBytes, textValues, checkboxValues);
  };

  const handleSave = async () => {
    const filled = await buildFilledPdf();
    if (!filled) return;
    setSaving(true);
    try {
      const blob = new Blob([new Uint8Array(filled)], { type: 'application/pdf' });
      await leaveRequestApi.update(leaveRequestId, blob, {
        noticeReferenceNo: noticeReferenceNo || undefined,
        dateOfNotice: dateOfNotice || undefined,
        suspensionType: suspensionType || undefined,
        partialScope: suspensionType === 'Partial' ? partialScope || undefined : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        totalDays: totalDays ?? undefined,
        reason: reason || undefined,
      });
      setPdfBytes(filled);
      queryClient.invalidateQueries({ queryKey: ['hr-leave-requests'] });
      showToast('Saved.', 'success');
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to save.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!suspensionType || !startDate || !endDate) {
      showToast('Suspension type, start date, and end date are required before sending for signature.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const filled = await buildFilledPdf();
      if (filled) {
        const blob = new Blob([new Uint8Array(filled)], { type: 'application/pdf' });
        await leaveRequestApi.update(leaveRequestId, blob, {
          noticeReferenceNo: noticeReferenceNo || undefined,
          dateOfNotice: dateOfNotice || undefined,
          suspensionType,
          partialScope: suspensionType === 'Partial' ? partialScope || undefined : undefined,
          startDate,
          endDate,
          totalDays: totalDays ?? undefined,
          reason: reason || undefined,
        });
      }
      await leaveRequestApi.submit(leaveRequestId);
      queryClient.invalidateQueries({ queryKey: ['hr-leave-requests'] });
      showToast('Sent for Department Head signature.', 'success');
      navigate('/hr/leave-requests');
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to submit.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const pdfUrl = pdfBytes ? URL.createObjectURL(new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })) : null;

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-border shrink-0 flex-wrap">
        <Button variant="outline" size="icon" onClick={() => navigate('/hr/leave-requests')}>
          <ArrowLeft size={20} />
        </Button>
        <div className="min-w-0 mr-2">
          <h1 className="text-lg font-bold text-foreground truncate">{detail?.employeeFullNameEn ?? 'Leave Request'}</h1>
          <p className="text-xs text-muted-foreground">{detail ? LEAVE_REQUEST_STATUS_LABELS[detail.status] : ''}</p>
        </div>

        {isDraft && (
          <>
            <Input className="w-32 h-9" placeholder="Ref. No." value={noticeReferenceNo} onChange={(e) => setNoticeReferenceNo(e.target.value)} />
            <Input type="date" className="w-36 h-9" value={dateOfNotice} onChange={(e) => setDateOfNotice(e.target.value)} title="Date of Notice" />
            <Select value={suspensionType} onValueChange={(v) => setSuspensionType(v as SuspensionType)}>
              <SelectTrigger className="w-28 h-9"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Full">Full</SelectItem>
                <SelectItem value="Partial">Partial</SelectItem>
              </SelectContent>
            </Select>
            {suspensionType === 'Partial' && (
              <Input className="w-40 h-9" placeholder="Scope" value={partialScope} onChange={(e) => setPartialScope(e.target.value)} />
            )}
            <Input type="date" className="w-36 h-9" value={startDate} onChange={(e) => setStartDate(e.target.value)} title="Start Date" />
            <Input type="date" className="w-36 h-9" value={endDate} onChange={(e) => setEndDate(e.target.value)} title="End Date" />
            <span className="text-xs text-muted-foreground tabular-nums">{totalDays != null ? `${totalDays}d` : ''}</span>

            <Button size="sm" variant="outline" className="gap-1.5" disabled={!pdfBytes || saving || submitting} onClick={handleSave}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button size="sm" className="gap-1.5" disabled={!pdfBytes || saving || submitting} onClick={handleSubmit}>
              <Send size={14} /> {submitting ? 'Sending…' : 'Send for Signature'}
            </Button>
          </>
        )}
      </div>

      {isDraft && (
        <div className="px-4 py-2 border-b border-border shrink-0">
          <Textarea placeholder="Reason for suspension" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        {!pdfBytes && <div className="flex items-center justify-center h-full text-muted-foreground">Loading…</div>}
        {pdfBytes && isDraft && <InteractivePdfEditor ref={editorRef} pdfBytes={pdfBytes} />}
        {pdfBytes && !isDraft && pdfUrl && <embed src={pdfUrl} type="application/pdf" className="w-full h-full" />}
      </div>
    </div>
  );
}
