import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Eye, PenTool, Undo2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { hrApi } from '../api/hrApi';
import { ActionIconButton } from '../components/ActionIconButton';
import { SignaturePad } from '../components/SignaturePad';
import { stampDepartmentHeadSignature } from '../utils/contractPdf';
import { useHrLanguage, bilingual } from '../context/HrLanguageContext';
import { CONTRACT_STATUS_LABEL, CONTRACT_STATUS_BADGE_CLASS, formatDate } from '../utils/hrUtils';
import type { HrContract, HrEmployee, HrSignatureMethod } from '../types/hrApi';

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
  const queryClient = useQueryClient();

  const [captureOpen, setCaptureOpen] = useState(false);
  const [signingContractId, setSigningContractId] = useState<number | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [reviewItem, setReviewItem] = useState<PendingItem | null>(null);
  const [reviewPdfUrl, setReviewPdfUrl] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const signatureBytesRef = useRef<{ bytes: Uint8Array; type: 'png' | 'jpeg' } | null>(null);

  const meQuery = useQuery({
    queryKey: ['hr-department-head-me'],
    queryFn: hrApi.getMyDepartmentHead,
  });

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
      const signed = await stampDepartmentHeadSignature(
        new Uint8Array(buffer),
        signatureBytesRef.current.bytes,
        signatureBytesRef.current.type
      );
      const blob = new Blob([new Uint8Array(signed)], { type: 'application/pdf' });
      await hrApi.signContract(
        item.contract.id,
        blob,
        'DepartmentHead',
        bilingual(language, item.employee.fullNameEn, item.employee.fullNameAr),
        signatureQuery.data.signatureMethod
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

  const departmentLabel = bilingual(language, meQuery.data.departmentNameEn, meQuery.data.departmentNameAr);
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
              className="gap-1.5"
              disabled={!hasSignature || signingContractId === reviewItem.contract.id}
              onClick={handleSignInReview}
            >
              <CheckCircle2 size={14} />
              {signingContractId === reviewItem.contract.id ? 'Signing…' : 'Sign & Next'}
            </Button>
          </div>
          <div className="flex-1 min-h-0">
            <embed src={reviewPdfUrl} type="application/pdf" className="w-full h-full" />
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Department Approvals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Contract renewals awaiting your signature — {departmentLabel}
          </p>
        </div>

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
                className="gap-1.5 shrink-0"
                disabled={!hasSignature || bulkProgress !== null}
                onClick={handleSignAll}
              >
                <CheckCircle2 size={14} />
                {bulkProgress ? `Signing ${bulkProgress.done + 1} of ${bulkProgress.total}…` : `Sign All (${pending.length})`}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
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
                            icon={CheckCircle2}
                            label={signingContractId === item.contract.id ? 'Signing…' : 'Sign'}
                            disabled={!hasSignature || signingContractId !== null}
                            onClick={() => handleSignRow(item)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <SignaturePad
          open={captureOpen}
          onCancel={() => setCaptureOpen(false)}
          onConfirm={handleSignatureCaptured}
        />
      </div>
    </TooltipProvider>
  );
}
