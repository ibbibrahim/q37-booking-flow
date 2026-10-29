import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, ChevronDown, ClipboardList, Eye, FileSignature, History, PenTool, RotateCcw, Undo2, UserCheck, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSignalR } from '@/contexts/SignalRContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { hrApi } from '../api/hrApi';
import { leaveRequestApi } from '../api/leaveRequestApi';
import { hiringRequestApi } from '../api/hiringRequestApi';
import { stampManagerStartSignature } from '../utils/hiringFormsPdf';
import { ActionIconButton } from '../components/ActionIconButton';
import { SignaturePad } from '../components/SignaturePad';
import { ReturnContractModal } from '../components/ReturnContractModal';
import { stampDepartmentHeadSignature } from '../utils/contractPdf';
import { stampDeptHeadSignature as stampLeaveDeptHeadSignature } from '../utils/leaveSuspensionPdf';
import { useHrLanguage, bilingual } from '../context/HrLanguageContext';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { CONTRACT_STATUS_LABEL, CONTRACT_STATUS_BADGE_CLASS, formatDate } from '../utils/hrUtils';
import type { HrContract, HrContractSignature, HrEmployee, HrSignatureMethod } from '../types/hrApi';

// --- Small shared pieces reused across this page's four approval queues ---

/** Consistent "icon + title + pending count" header for each queue section. */
function SectionHeader({ icon: Icon, title, count }: { icon: typeof FileSignature; title: string; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={15} className="text-muted-foreground" />
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <Badge variant="soft">{count}</Badge>
    </div>
  );
}

/** Collapsed-by-default "what you already signed" strip, so a signed item
 * is never just gone — it's one click away under the pending queue it came
 * from. */
function HistoryPanel({ count, children }: { count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-t border-border mt-3 pt-3">
      <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ChevronDown size={13} className={cn('transition-transform', open && 'rotate-180')} />
        <History size={13} />
        Recently signed by you ({count})
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}

/** Read-only PDF preview reused by every "View" action on this page — both
 * for a pending item before signing, and for an already-signed one in a
 * History panel. */
function PdfQuickViewDialog({
  open, onOpenChange, title, url,
}: { open: boolean; onOpenChange: (open: boolean) => void; title: string; url: string | null }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[90vw] h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 py-3.5 border-b border-border space-y-0">
          <DialogTitle className="text-sm">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 bg-muted/30">
          {url ? (
            <embed src={url} type="application/pdf" className="w-full h-full" />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading…</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Confirmation before stamping the saved signature — shared by the row
 * "Sign" button, "Sign All", and the full-screen review mode's "Sign &
 * Next" button below. */
function SignContractConfirmDialog({
  target, busy, onConfirm, onCancel,
}: { target: PendingItem | null; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  const { language } = useHrLanguage();
  return (
    <AlertDialog open={!!target} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="sm:max-w-[420px]">
        <AlertDialogHeader className="flex-row items-start gap-3.5 text-left">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-primary/5">
            <PenTool size={19} strokeWidth={2.25} />
          </div>
          <div className="space-y-1.5 pt-0.5">
            <AlertDialogTitle>Sign this contract?</AlertDialogTitle>
            <AlertDialogDescription>
              {target
                ? `This stamps your saved signature on ${bilingual(language, target.employee.fullNameEn, target.employee.fullNameAr)}'s contract and moves it forward.`
                : ''}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={busy} className="gap-1.5" onClick={onConfirm}>
            <PenTool size={14} /> Sign
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface PendingItem {
  employee: HrEmployee;
  contract: HrContract;
}

/** Department Head's approval queue — scoped to whichever department the
 * logged-in user is mapped to (hr_department_heads). Unlike the employee,
 * who signs fresh each time in person, a Department Head saves their
 * signature once and every contract they approve afterward reuses it — so
 * approving is a single click per contract, or all of them at once, with no
 * per-contract re-signing. */
export function DepartmentApprovalsPage() {
  const { language } = useHrLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // Who's actually signing — NOT the employee whose contract this is. Falls
  // back to username since displayName isn't guaranteed to be set for every
  // account.
  const signerName = user?.displayName || user?.username || 'Department Head';

  const [captureOpen, setCaptureOpen] = useState(false);
  const [signingContractId, setSigningContractId] = useState<number | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [reviewItem, setReviewItem] = useState<PendingItem | null>(null);
  const [reviewPdfUrl, setReviewPdfUrl] = useState<string | null>(null);
  const [returnTarget, setReturnTarget] = useState<PendingItem | null>(null);
  const [bulkReturnOpen, setBulkReturnOpen] = useState(false);
  const [returning, setReturning] = useState(false);
  const [signConfirm, setSignConfirm] = useState<PendingItem | null>(null);
  const [signAllConfirmOpen, setSignAllConfirmOpen] = useState(false);
  const [historyPreview, setHistoryPreview] = useState<{ title: string; url: string | null } | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const historyObjectUrlRef = useRef<string | null>(null);
  const signatureBytesRef = useRef<{ bytes: Uint8Array; type: 'png' | 'jpeg' } | null>(null);

  const meQuery = useQuery({
    queryKey: ['hr-department-head-me'],
    queryFn: hrApi.getMyDepartmentHead,
  });

  // Genuinely dynamic subtitle (depends on fetched data) — this is exactly
  // why usePageHeader exists rather than a static route→title lookup table.
  usePageHeader(
    'Department Approvals',
    meQuery.data
      ? `Contract renewals awaiting your signature — ${bilingual(language, meQuery.data.departmentNameEn, meQuery.data.departmentNameAr)}`
      : null
  );

  const signatureQuery = useQuery({
    queryKey: ['hr-department-head-signature-me'],
    queryFn: hrApi.getMyDepartmentHeadSignature,
  });

  const departmentId = meQuery.data?.departmentId;

  const employeesQuery = useQuery({
    queryKey: ['hr-employees', 'Freelance', 'department-approvals', departmentId],
    queryFn: () => hrApi.searchEmployees({ contractType: 'Freelance', departmentId, page: 1, pageSize: 2000 }),
    enabled: !!departmentId,
  });

  const employees = employeesQuery.data?.items ?? [];
  const employeeIds = employees.map((e) => e.id);

  const contractsQueryKey = ['hr-contracts-by-employees', 'department-approvals', employeeIds.join(',')];
  const contractsQuery = useQuery({
    queryKey: contractsQueryKey,
    queryFn: () => hrApi.getLatestContractsForEmployees(employeeIds),
    enabled: employeeIds.length > 0,
  });

  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const pending: PendingItem[] = useMemo(
    () =>
      (contractsQuery.data ?? [])
        .filter((c) => c.status === 'AwaitingDepartmentHeadSignature')
        .map((c) => ({ contract: c, employee: employeeById.get(c.employeeId) }))
        .filter((p): p is PendingItem => !!p.employee),
    [contractsQuery.data, employeeById]
  );

  // Already-signed contracts, newest first — reuses the same "latest
  // contract per employee" data already fetched for `pending` above, so no
  // extra query. Lets a Department Head look back at what they approved
  // instead of it just disappearing from the page.
  const signedHistory = useMemo(
    () =>
      (contractsQuery.data ?? [])
        .map((c) => ({
          contract: c,
          employee: employeeById.get(c.employeeId),
          signature: c.signatures.find((s) => s.role === 'DepartmentHead'),
        }))
        .filter((x): x is { contract: HrContract; employee: HrEmployee; signature: HrContractSignature } => !!x.employee && !!x.signature)
        .sort((a, b) => new Date(b.signature.signedAt).getTime() - new Date(a.signature.signedAt).getTime()),
    [contractsQuery.data, employeeById]
  );

  // The saved signature's bytes are fetched once and reused for every stamp
  // — no need to re-fetch per contract, whether signing one or all of them.
  useEffect(() => {
    signatureBytesRef.current = null;
    if (!signatureQuery.data) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(signatureQuery.data!.imageUrl);
      const buf = await res.arrayBuffer();
      if (cancelled) return;
      const lower = signatureQuery.data!.imageUrl.toLowerCase();
      const type: 'png' | 'jpeg' = lower.endsWith('.jpg') || lower.endsWith('.jpeg') ? 'jpeg' : 'png';
      signatureBytesRef.current = { bytes: new Uint8Array(buf), type };
    })();
    return () => {
      cancelled = true;
    };
  }, [signatureQuery.data]);

  const refreshQueue = () => {
    queryClient.invalidateQueries({ queryKey: contractsQueryKey });
  };

  const handleSignatureCaptured = async (blob: Blob, method: HrSignatureMethod) => {
    try {
      await hrApi.saveMyDepartmentHeadSignature(blob, method);
      await queryClient.invalidateQueries({ queryKey: ['hr-department-head-signature-me'] });
      setCaptureOpen(false);
      showToast('Signature saved.', 'success');
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to save signature.'), 'error');
    }
  };

  // Stamps the saved signature onto one contract and advances its status —
  // the actual per-contract work shared by the row "Sign" button, "Sign
  // All", and the review screen's "Sign" button.
  const signOne = async (item: PendingItem): Promise<boolean> => {
    if (!signatureBytesRef.current || !signatureQuery.data) {
      showToast('Save your signature first.', 'error');
      return false;
    }
    try {
      const buffer = await hrApi.getContractPdfBytes(item.contract.id);
      const { bytes: signed, verificationId } = await stampDepartmentHeadSignature(
        new Uint8Array(buffer),
        signatureBytesRef.current.bytes,
        signatureBytesRef.current.type
      );
      const blob = new Blob([new Uint8Array(signed)], { type: 'application/pdf' });
      await hrApi.signContract(
        item.contract.id,
        blob,
        'DepartmentHead',
        signerName,
        signatureQuery.data.signatureMethod,
        verificationId,
        user?.email,
        signatureBytesRef.current
      );
      return true;
    } catch (err) {
      showToast(
        getApiErrorMessage(err, `Failed to sign ${bilingual(language, item.employee.fullNameEn, item.employee.fullNameAr)}'s contract.`),
        'error'
      );
      return false;
    }
  };

  const handleSignRow = async (item: PendingItem) => {
    setSigningContractId(item.contract.id);
    const ok = await signOne(item);
    setSigningContractId(null);
    if (ok) {
      showToast(`Signed ${bilingual(language, item.employee.fullNameEn, item.employee.fullNameAr)}'s contract.`, 'success');
      refreshQueue();
    }
  };

  const handleSignAll = async () => {
    if (!signatureBytesRef.current) {
      showToast('Save your signature first.', 'error');
      return;
    }
    const queue = pending;
    let succeeded = 0;
    for (let i = 0; i < queue.length; i++) {
      setBulkProgress({ done: i, total: queue.length });
      setSigningContractId(queue[i].contract.id);
      // eslint-disable-next-line no-await-in-loop
      if (await signOne(queue[i])) succeeded++;
    }
    setSigningContractId(null);
    setBulkProgress(null);
    showToast(`Signed ${succeeded} of ${queue.length} contracts.`, succeeded === queue.length ? 'success' : 'error');
    refreshQueue();
  };

  const openReview = async (item: PendingItem) => {
    const buffer = await hrApi.getContractPdfBytes(item.contract.id);
    const blob = new Blob([new Uint8Array(buffer)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = url;
    setReviewPdfUrl(url);
    setReviewItem(item);
  };

  const closeReview = () => {
    setReviewItem(null);
    setReviewPdfUrl(null);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const openHistoryPreview = async (contractId: number, title: string) => {
    setHistoryPreview({ title, url: null });
    const buffer = await hrApi.getContractPdfBytes(contractId);
    const blob = new Blob([new Uint8Array(buffer)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    if (historyObjectUrlRef.current) URL.revokeObjectURL(historyObjectUrlRef.current);
    historyObjectUrlRef.current = url;
    setHistoryPreview({ title, url });
  };

  const closeHistoryPreview = () => {
    setHistoryPreview(null);
    if (historyObjectUrlRef.current) {
      URL.revokeObjectURL(historyObjectUrlRef.current);
      historyObjectUrlRef.current = null;
    }
  };

  // DocuSign-style auto-navigate: signing here jumps straight to the next
  // pending contract instead of bouncing back to the list — computed
  // locally from the current queue rather than waiting on a refetch, so the
  // next document is ready immediately.
  const handleSignInReview = async () => {
    if (!reviewItem) return;
    setSigningContractId(reviewItem.contract.id);
    const ok = await signOne(reviewItem);
    setSigningContractId(null);
    if (!ok) return;

    showToast(`Signed ${bilingual(language, reviewItem.employee.fullNameEn, reviewItem.employee.fullNameAr)}'s contract.`, 'success');
    refreshQueue();

    const currentIndex = pending.findIndex((p) => p.contract.id === reviewItem.contract.id);
    const remaining = pending.filter((p) => p.contract.id !== reviewItem.contract.id);
    if (remaining.length === 0) {
      closeReview();
      return;
    }
    const nextIndex = Math.min(currentIndex, remaining.length - 1);
    await openReview(remaining[nextIndex]);
  };

  const returnOne = async (item: PendingItem, reason: string): Promise<boolean> => {
    try {
      await hrApi.returnContract(item.contract.id, reason);
      return true;
    } catch (err) {
      showToast(
        getApiErrorMessage(err, `Failed to return ${bilingual(language, item.employee.fullNameEn, item.employee.fullNameAr)}'s contract.`),
        'error'
      );
      return false;
    }
  };

  // Shared by the per-row Return button and the review screen's Return
  // button — if the returned contract is the one currently open in review,
  // auto-navigate to the next pending one, same as signing does.
  const handleReturnConfirm = async (reason: string) => {
    if (!returnTarget) return;
    const item = returnTarget;
    setReturning(true);
    const ok = await returnOne(item, reason);
    setReturning(false);
    setReturnTarget(null);
    if (!ok) return;

    showToast(`Returned ${bilingual(language, item.employee.fullNameEn, item.employee.fullNameAr)}'s contract.`, 'success');
    refreshQueue();

    if (reviewItem && reviewItem.contract.id === item.contract.id) {
      const currentIndex = pending.findIndex((p) => p.contract.id === item.contract.id);
      const remaining = pending.filter((p) => p.contract.id !== item.contract.id);
      if (remaining.length === 0) {
        closeReview();
        return;
      }
      const nextIndex = Math.min(currentIndex, remaining.length - 1);
      await openReview(remaining[nextIndex]);
    }
  };

  const handleBulkReturnConfirm = async (reason: string) => {
    setReturning(true);
    const queue = pending;
    let succeeded = 0;
    for (let i = 0; i < queue.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      if (await returnOne(queue[i], reason)) succeeded++;
    }
    setReturning(false);
    setBulkReturnOpen(false);
    showToast(`Returned ${succeeded} of ${queue.length} contracts.`, succeeded === queue.length ? 'success' : 'error');
    refreshQueue();
  };

  if (meQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!meQuery.data) {
    return (
      <div className="text-center py-16 text-muted-foreground max-w-md mx-auto">
        <Users size={32} className="mx-auto mb-3 opacity-50" />
        You're not assigned as a Department Head for any department yet — ask HR to assign you before contracts show up here.
      </div>
    );
  }

  const hasSignature = !!signatureQuery.data;
  const isLoading = employeesQuery.isLoading || contractsQuery.isLoading;

  if (reviewItem && reviewPdfUrl) {
    return (
      <TooltipProvider delayDuration={200}>
        <div className="h-[calc(100vh-2rem)] flex flex-col">
          <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
            <ActionIconButton icon={Undo2} label="Back to Queue" variant="outline" onClick={closeReview} />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">
                {bilingual(language, reviewItem.employee.fullNameEn, reviewItem.employee.fullNameAr)}
              </h1>
              <p className="text-xs text-muted-foreground">
                {pending.findIndex((p) => p.contract.id === reviewItem.contract.id) + 1} of {pending.length} awaiting your signature
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-destructive hover:text-destructive"
              disabled={signingContractId === reviewItem.contract.id}
              onClick={() => setReturnTarget(reviewItem)}
            >
              <RotateCcw size={14} /> Return
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              disabled={!hasSignature || signingContractId === reviewItem.contract.id}
              onClick={() => setSignConfirm(reviewItem)}
            >
              <CheckCircle2 size={14} />
              {signingContractId === reviewItem.contract.id ? 'Signing…' : 'Sign & Next'}
            </Button>
          </div>
          <div className="flex-1 min-h-0">
            <embed src={reviewPdfUrl} type="application/pdf" className="w-full h-full" />
          </div>
        </div>

        <ReturnContractModal
          open={!!returnTarget}
          onOpenChange={(open) => { if (!open) setReturnTarget(null); }}
          title="Return this contract?"
          description={`This sends ${returnTarget ? bilingual(language, returnTarget.employee.fullNameEn, returnTarget.employee.fullNameAr) : ''}'s contract back — it becomes read-only, and HR will need to start a new renewal to correct it.`}
          loading={returning}
          onConfirm={handleReturnConfirm}
        />
        <SignContractConfirmDialog
          target={signConfirm}
          busy={signingContractId !== null}
          onCancel={() => setSignConfirm(null)}
          onConfirm={() => { setSignConfirm(null); handleSignInReview(); }}
        />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div
              onClick={() => setCaptureOpen(true)}
              className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm cursor-pointer hover:border-primary hover:bg-primary/5 shrink-0"
            >
              {hasSignature && signatureQuery.data ? (
                <>
                  <img src={signatureQuery.data.imageUrl} alt="Your signature" className="h-6 max-w-[6.5rem] object-contain" />
                  <span className="text-[10px] text-muted-foreground ml-1">Change</span>
                </>
              ) : (
                <>
                  <PenTool size={15} className="text-primary shrink-0" />
                  Create Your Signature
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex-1">
              {hasSignature
                ? 'Saved once — every contract you approve below reuses it automatically.'
                : 'Save your signature once to start approving contracts below.'}
            </p>
            {pending.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 shrink-0 text-destructive hover:text-destructive"
                disabled={bulkProgress !== null || returning}
                onClick={() => setBulkReturnOpen(true)}
              >
                <RotateCcw size={14} /> Return All ({pending.length})
              </Button>
            )}
            {pending.length > 0 && (
              <Button
                size="sm"
                className="gap-1.5 shrink-0"
                disabled={!hasSignature || bulkProgress !== null}
                onClick={() => setSignAllConfirmOpen(true)}
              >
                <CheckCircle2 size={14} />
                {bulkProgress ? `Signing ${bulkProgress.done + 1} of ${bulkProgress.total}…` : `Sign All (${pending.length})`}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 pb-0">
            <SectionHeader icon={FileSignature} title="Contract Renewals" count={pending.length} />
          </CardContent>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && pending.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                      No contracts awaiting your signature right now.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading &&
                  pending.map((item) => (
                    <TableRow key={item.contract.id}>
                      <TableCell className="font-medium text-foreground">
                        {bilingual(language, item.employee.fullNameEn, item.employee.fullNameAr)}
                      </TableCell>
                      <TableCell>{bilingual(language, item.employee.jobTitleEn, item.employee.jobTitleAr)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(item.contract.createdAt)}</TableCell>
                      <TableCell>
                        <Badge className={CONTRACT_STATUS_BADGE_CLASS[item.contract.status]}>
                          {CONTRACT_STATUS_LABEL[item.contract.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <ActionIconButton icon={Eye} label="View" onClick={() => openReview(item)} />
                          <ActionIconButton
                            icon={RotateCcw}
                            label="Return"
                            destructive
                            disabled={signingContractId !== null || returning}
                            onClick={() => setReturnTarget(item)}
                          />
                          <ActionIconButton
                            icon={CheckCircle2}
                            label={signingContractId === item.contract.id ? 'Signing…' : 'Sign'}
                            disabled={!hasSignature || signingContractId !== null}
                            onClick={() => setSignConfirm(item)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardContent className="px-4 pb-4 pt-0">
            <HistoryPanel count={signedHistory.length}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Signed By</TableHead>
                    <TableHead>Signed At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signedHistory.map(({ contract, employee, signature }) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium text-foreground">
                        {bilingual(language, employee.fullNameEn, employee.fullNameAr)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{signature.signedByName}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(signature.signedAt)}</TableCell>
                      <TableCell className="text-right">
                        <ActionIconButton
                          icon={Eye}
                          label="View"
                          onClick={() => openHistoryPreview(contract.id, bilingual(language, employee.fullNameEn, employee.fullNameAr))}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </HistoryPanel>
          </CardContent>
        </Card>

        <LeaveNoticesSection signatureBytesRef={signatureBytesRef} hasSignature={hasSignature} signerName={signerName} />
        <InterviewReviewsSection />
        <StartingDateConfirmationsSection signatureBytesRef={signatureBytesRef} hasSignature={hasSignature} signerName={signerName} />

        <SignaturePad
          open={captureOpen}
          onCancel={() => setCaptureOpen(false)}
          onConfirm={handleSignatureCaptured}
        />

        <ReturnContractModal
          open={!!returnTarget}
          onOpenChange={(open) => { if (!open) setReturnTarget(null); }}
          title="Return this contract?"
          description={`This sends ${returnTarget ? bilingual(language, returnTarget.employee.fullNameEn, returnTarget.employee.fullNameAr) : ''}'s contract back — it becomes read-only, and HR will need to start a new renewal to correct it.`}
          loading={returning}
          onConfirm={handleReturnConfirm}
        />

        <ReturnContractModal
          open={bulkReturnOpen}
          onOpenChange={setBulkReturnOpen}
          title={`Return all ${pending.length} contracts?`}
          description="The same reason is recorded on every contract returned. Each becomes read-only, and HR will need to start a new renewal for each one."
          loading={returning}
          onConfirm={handleBulkReturnConfirm}
        />

        <SignContractConfirmDialog
          target={signConfirm}
          busy={signingContractId !== null}
          onCancel={() => setSignConfirm(null)}
          onConfirm={() => { const item = signConfirm; setSignConfirm(null); if (item) handleSignRow(item); }}
        />

        <AlertDialog open={signAllConfirmOpen} onOpenChange={setSignAllConfirmOpen}>
          <AlertDialogContent className="sm:max-w-[420px]">
            <AlertDialogHeader className="flex-row items-start gap-3.5 text-left">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-primary/5">
                <PenTool size={19} strokeWidth={2.25} />
              </div>
              <div className="space-y-1.5 pt-0.5">
                <AlertDialogTitle>Sign all {pending.length} contracts?</AlertDialogTitle>
                <AlertDialogDescription>
                  This stamps your saved signature on every contract currently awaiting your signature, one by one. If one was added
                  by mistake, return it afterward from the queue instead.
                </AlertDialogDescription>
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={bulkProgress !== null}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={bulkProgress !== null}
                className="gap-1.5"
                onClick={() => { setSignAllConfirmOpen(false); handleSignAll(); }}
              >
                <PenTool size={14} /> Sign All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <PdfQuickViewDialog
          open={!!historyPreview}
          onOpenChange={(open) => !open && closeHistoryPreview()}
          title={historyPreview?.title ?? ''}
          url={historyPreview?.url ?? null}
        />
      </div>
    </TooltipProvider>
  );
}

// Freelancer leave/suspension notices awaiting this Department Head's
// signature — a second, independent queue on the same screen. Reuses the
// signature already saved above for contracts (one saved signature per
// Department Head, reused everywhere they need to sign).
function LeaveNoticesSection({
  signatureBytesRef,
  hasSignature,
  signerName,
}: {
  signatureBytesRef: React.MutableRefObject<{ bytes: Uint8Array; type: 'png' | 'jpeg' } | null>;
  hasSignature: boolean;
  signerName: string;
}) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [signingId, setSigningId] = useState<number | null>(null);
  const [signConfirm, setSignConfirm] = useState<{ id: number; employeeName: string | null } | null>(null);
  const [preview, setPreview] = useState<{ id: number; title: string; url: string | null } | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const listQuery = useQuery({ queryKey: ['hr-leave-requests', 'department-approvals'], queryFn: leaveRequestApi.getAll });
  const pending = (listQuery.data ?? []).filter((r) => r.status === 'AwaitingDepartmentHeadSignature');
  const signedHistory = (listQuery.data ?? [])
    .filter((r) => !!r.deptHeadSignedAt)
    .sort((a, b) => new Date(b.deptHeadSignedAt!).getTime() - new Date(a.deptHeadSignedAt!).getTime());

  const { listen } = useSignalR();
  useEffect(
    () => listen('LeaveRequestChanged', () => queryClient.invalidateQueries({ queryKey: ['hr-leave-requests'] })),
    [listen, queryClient]
  );

  const openPreview = async (id: number, title: string) => {
    setPreview({ id, title, url: null });
    const buffer = await leaveRequestApi.getPdfBytes(id);
    const blob = new Blob([new Uint8Array(buffer)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = url;
    setPreview({ id, title, url });
  };

  const closePreview = () => {
    setPreview(null);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  const handleSign = async (id: number, employeeName: string | null) => {
    if (!signatureBytesRef.current) {
      showToast('Save your signature first.', 'error');
      return;
    }
    setSigningId(id);
    try {
      const buffer = await leaveRequestApi.getPdfBytes(id);
      const { bytes: signed, verificationId } = await stampLeaveDeptHeadSignature(
        new Uint8Array(buffer), signatureBytesRef.current.bytes, signatureBytesRef.current.type
      );
      const blob = new Blob([new Uint8Array(signed)], { type: 'application/pdf' });
      await leaveRequestApi.departmentHeadSign(id, blob, signerName, verificationId, signatureBytesRef.current);

      queryClient.invalidateQueries({ queryKey: ['hr-leave-requests'] });
      showToast(`Signed ${employeeName ?? 'the'} leave notice — sent to the freelancer to acknowledge.`, 'success');
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to sign leave notice.'), 'error');
    } finally {
      setSigningId(null);
    }
  };

  if (pending.length === 0 && signedHistory.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <SectionHeader icon={History} title="Leave / Suspension Notices Awaiting Your Signature" count={pending.length} />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Freelancer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Days</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pending.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                  No leave notices awaiting your signature right now.
                </TableCell>
              </TableRow>
            )}
            {pending.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-foreground">{r.employeeFullNameEn}</TableCell>
                <TableCell>{r.suspensionType}</TableCell>
                <TableCell>{r.startDate ? formatDate(r.startDate) : '—'} – {r.endDate ? formatDate(r.endDate) : '—'}</TableCell>
                <TableCell className="tabular-nums">{r.totalDays ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1.5">
                    <ActionIconButton icon={Eye} label="View" onClick={() => openPreview(r.id, r.employeeFullNameEn ?? 'Leave Notice')} />
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={!hasSignature || signingId !== null}
                      onClick={() => setSignConfirm({ id: r.id, employeeName: r.employeeFullNameEn })}
                    >
                      <CheckCircle2 size={14} /> {signingId === r.id ? 'Signing…' : 'Sign'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <HistoryPanel count={signedHistory.length}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Freelancer</TableHead>
                <TableHead>Signed By</TableHead>
                <TableHead>Signed At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {signedHistory.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-foreground">{r.employeeFullNameEn}</TableCell>
                  <TableCell className="text-muted-foreground">{r.deptHeadSignedByName}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(r.deptHeadSignedAt)}</TableCell>
                  <TableCell className="text-right">
                    <ActionIconButton icon={Eye} label="View" onClick={() => openPreview(r.id, r.employeeFullNameEn ?? 'Leave Notice')} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </HistoryPanel>
      </CardContent>

      <AlertDialog open={!!signConfirm} onOpenChange={(open) => !open && setSignConfirm(null)}>
        <AlertDialogContent className="sm:max-w-[420px]">
          <AlertDialogHeader className="flex-row items-start gap-3.5 text-left">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-primary/5">
              <PenTool size={19} strokeWidth={2.25} />
            </div>
            <div className="space-y-1.5 pt-0.5">
              <AlertDialogTitle>Sign this leave notice?</AlertDialogTitle>
              <AlertDialogDescription>
                {signConfirm
                  ? `This stamps your saved signature on ${signConfirm.employeeName ?? 'this'}'s leave notice and sends it to them to acknowledge.`
                  : ''}
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={signingId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={signingId !== null}
              className="gap-1.5"
              onClick={() => { const target = signConfirm; setSignConfirm(null); if (target) handleSign(target.id, target.employeeName); }}
            >
              <PenTool size={14} /> Sign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PdfQuickViewDialog open={!!preview} onOpenChange={(open) => !open && closePreview()} title={preview?.title ?? ''} url={preview?.url ?? null} />
    </Card>
  );
}

// Interview evaluations awaiting this Department Head's review — unlike the
// other sections here, this one opens a full editor (the Department Head can
// edit the Coordinator's fields/scores, not just stamp a saved signature),
// so it links out to a dedicated page rather than signing inline.
function InterviewReviewsSection() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<{ id: number; title: string; url: string | null } | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const listQuery = useQuery({ queryKey: ['hr-hiring-requests', 'department-approvals'], queryFn: hiringRequestApi.getAll });
  const pending = (listQuery.data ?? []).filter((r) => r.status === 'InterviewSubmitted' && !r.managerReviewedAt);
  const signedHistory = (listQuery.data ?? [])
    .filter((r) => !!r.managerReviewedAt)
    .sort((a, b) => new Date(b.managerReviewedAt!).getTime() - new Date(a.managerReviewedAt!).getTime());

  const { listen } = useSignalR();
  useEffect(
    () => listen('HiringRequestChanged', () => queryClient.invalidateQueries({ queryKey: ['hr-hiring-requests'] })),
    [listen, queryClient]
  );

  const openPreview = async (id: number, title: string) => {
    setPreview({ id, title, url: null });
    const buffer = await hiringRequestApi.getInterviewPdfBytes(id);
    const blob = new Blob([new Uint8Array(buffer)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = url;
    setPreview({ id, title, url });
  };

  const closePreview = () => {
    setPreview(null);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  if (pending.length === 0 && signedHistory.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <SectionHeader icon={ClipboardList} title="Interview Evaluations Awaiting Your Review" count={pending.length} />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Position</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pending.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                  No interview evaluations awaiting your review right now.
                </TableCell>
              </TableRow>
            )}
            {pending.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-foreground">{r.candidateName}</TableCell>
                <TableCell className="text-muted-foreground">{r.positionTitle}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => navigate(`/hr/freelance-hiring/hiring-requests/${r.id}/interview/review`)}
                  >
                    <Eye size={14} /> Review
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <HistoryPanel count={signedHistory.length}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Reviewed By</TableHead>
                <TableHead>Reviewed At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {signedHistory.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-foreground">{r.candidateName}</TableCell>
                  <TableCell className="text-muted-foreground">{r.managerReviewedByName}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(r.managerReviewedAt)}</TableCell>
                  <TableCell className="text-right">
                    <ActionIconButton icon={Eye} label="View" onClick={() => openPreview(r.id, r.candidateName)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </HistoryPanel>
      </CardContent>

      <PdfQuickViewDialog open={!!preview} onOpenChange={(open) => !open && closePreview()} title={preview?.title ?? ''} url={preview?.url ?? null} />
    </Card>
  );
}

// Starting Date confirmations awaiting this Department Head's signature —
// the Coordinator has already recorded whether the candidate showed up
// (and captured their in-person signature if so); this is the final step
// of that signature chain, same reused saved signature as everything else
// on this screen.
function StartingDateConfirmationsSection({
  signatureBytesRef,
  hasSignature,
  signerName,
}: {
  signatureBytesRef: React.MutableRefObject<{ bytes: Uint8Array; type: 'png' | 'jpeg' } | null>;
  hasSignature: boolean;
  signerName: string;
}) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [signingId, setSigningId] = useState<number | null>(null);
  const [signConfirm, setSignConfirm] = useState<{ id: number; intent: 'Started' | 'NotStarted'; candidateName: string } | null>(null);
  const [preview, setPreview] = useState<{ id: number; title: string; url: string | null } | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const listQuery = useQuery({ queryKey: ['hr-hiring-requests', 'department-approvals'], queryFn: hiringRequestApi.getAll });
  const pending = (listQuery.data ?? []).filter(
    (r) => r.status === 'StartingDateSet' && r.startIntent && !r.managerStartSignedAt
  );
  const signedHistory = (listQuery.data ?? [])
    .filter((r) => !!r.managerStartSignedAt)
    .sort((a, b) => new Date(b.managerStartSignedAt!).getTime() - new Date(a.managerStartSignedAt!).getTime());

  const { listen } = useSignalR();
  useEffect(
    () => listen('HiringRequestChanged', () => queryClient.invalidateQueries({ queryKey: ['hr-hiring-requests'] })),
    [listen, queryClient]
  );

  const openPreview = async (id: number, title: string) => {
    setPreview({ id, title, url: null });
    const buffer = await hiringRequestApi.getPdfBytes(id);
    const blob = new Blob([new Uint8Array(buffer)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = url;
    setPreview({ id, title, url });
  };

  const closePreview = () => {
    setPreview(null);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  const handleSign = async (id: number, intent: 'Started' | 'NotStarted', candidateName: string) => {
    if (!signatureBytesRef.current) {
      showToast('Save your signature first.', 'error');
      return;
    }
    setSigningId(id);
    try {
      const buffer = await hiringRequestApi.getPdfBytes(id);
      const { bytes: signed, verificationId } = await stampManagerStartSignature(
        new Uint8Array(buffer), signatureBytesRef.current.bytes, signatureBytesRef.current.type, intent
      );
      const blob = new Blob([new Uint8Array(signed)], { type: 'application/pdf' });
      await hiringRequestApi.managerStartSign(id, blob, signerName, verificationId, signatureBytesRef.current);

      queryClient.invalidateQueries({ queryKey: ['hr-hiring-requests'] });
      showToast(`Signed ${candidateName}'s starting date confirmation.`, 'success');
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to sign.'), 'error');
    } finally {
      setSigningId(null);
    }
  };

  if (pending.length === 0 && signedHistory.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <SectionHeader icon={UserCheck} title="Starting Date Confirmations Awaiting Your Signature" count={pending.length} />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Starting Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pending.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                  No starting date confirmations awaiting your signature right now.
                </TableCell>
              </TableRow>
            )}
            {pending.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-foreground">{r.candidateName}</TableCell>
                <TableCell>{r.startIntent === 'Started' ? 'Started' : 'Did not show up'}</TableCell>
                <TableCell className="text-muted-foreground">{r.startingDate ? formatDate(r.startingDate) : '—'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1.5">
                    <ActionIconButton icon={Eye} label="View" onClick={() => openPreview(r.id, r.candidateName)} />
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={!hasSignature || signingId !== null}
                      onClick={() => setSignConfirm({ id: r.id, intent: r.startIntent as 'Started' | 'NotStarted', candidateName: r.candidateName })}
                    >
                      <CheckCircle2 size={14} /> {signingId === r.id ? 'Signing…' : 'Sign'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <HistoryPanel count={signedHistory.length}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Signed At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {signedHistory.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-foreground">{r.candidateName}</TableCell>
                  <TableCell className="text-muted-foreground">{r.startIntent === 'Started' ? 'Started' : 'Did not show up'}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(r.managerStartSignedAt)}</TableCell>
                  <TableCell className="text-right">
                    <ActionIconButton icon={Eye} label="View" onClick={() => openPreview(r.id, r.candidateName)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </HistoryPanel>
      </CardContent>

      <AlertDialog open={!!signConfirm} onOpenChange={(open) => !open && setSignConfirm(null)}>
        <AlertDialogContent className="sm:max-w-[420px]">
          <AlertDialogHeader className="flex-row items-start gap-3.5 text-left">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-primary/5">
              <PenTool size={19} strokeWidth={2.25} />
            </div>
            <div className="space-y-1.5 pt-0.5">
              <AlertDialogTitle>Sign this starting date confirmation?</AlertDialogTitle>
              <AlertDialogDescription>
                {signConfirm
                  ? `This stamps your saved signature confirming ${signConfirm.candidateName} ${signConfirm.intent === 'Started' ? 'started as scheduled' : 'did not show up'}. HR can then proceed with ${signConfirm.intent === 'Started' ? 'converting them to an employee' : 'marking them not-started'}.`
                  : ''}
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={signingId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={signingId !== null}
              className="gap-1.5"
              onClick={() => { const t = signConfirm; setSignConfirm(null); if (t) handleSign(t.id, t.intent, t.candidateName); }}
            >
              <PenTool size={14} /> Sign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PdfQuickViewDialog open={!!preview} onOpenChange={(open) => !open && closePreview()} title={preview?.title ?? ''} url={preview?.url ?? null} />
    </Card>
  );
}
