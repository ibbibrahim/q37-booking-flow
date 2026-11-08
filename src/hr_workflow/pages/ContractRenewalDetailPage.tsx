import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  PenLine,
  Eye,
  Send,
  CheckCircle2,
  MoreVertical,
  History,
  Download,
  Printer,
  ShieldCheck,
  Trash2,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusPill } from '@/components/ui/status-pill';
import type { Tone } from '@/lib/tone';
import { cn } from '@/lib/utils';
import { DATA_TABLE_WRAPPER, DATA_TABLE_GRID, DATA_TABLE_HEADER_ROW, DATA_TABLE_HEAD, DATA_TABLE_ROW } from '@/lib/tableStyles';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ConfirmActionModal } from '@/admin/components/ConfirmActionModal';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { hrApi } from '../api/hrApi';
import { ActionIconButton } from '../components/ActionIconButton';
import { ContractStatusModal } from '../components/ContractStatusModal';
import { ContractHistoryModal } from '../components/ContractHistoryModal';
import { ContractVerifyUploadModal } from '../components/ContractVerifyUploadModal';
import { useHrLanguage, bilingual } from '../context/HrLanguageContext';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { formatDate, CONTRACT_STATUS_LABEL } from '../utils/hrUtils';
import type { HrContractBatchMember, HrContractStatus } from '../types/hrApi';

const CONTRACT_STATUS_TONE: Record<HrContractStatus, Tone> = {
  AwaitingEmployeeSignature: 'warning',
  AwaitingDepartmentHeadSignature: 'warning',
  AwaitingFinalSignature: 'warning',
  Completed: 'success',
  Returned: 'destructive',
};

/** One renewal's full member list, with the same per-contract actions the
 * roster table used to offer — Edit/View/Send for Signature/Status/History/
 * Download/Print/Verify/Discard — scoped to just this renewal's employees. */
export function ContractRenewalDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const id = Number(batchId);
  const navigate = useNavigate();
  const { language } = useHrLanguage();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [discardTarget, setDiscardTarget] = useState<HrContractBatchMember | null>(null);
  const [statusTarget, setStatusTarget] = useState<HrContractBatchMember | null>(null);
  const [historyContractId, setHistoryContractId] = useState<number | null>(null);
  const [verifyContractId, setVerifyContractId] = useState<number | null>(null);

  const detailQueryKey = ['hr-contract-batch', id];
  const detailQuery = useQuery({
    queryKey: detailQueryKey,
    queryFn: () => hrApi.getContractBatchDetail(id),
    enabled: Number.isFinite(id),
  });

  const batch = detailQuery.data?.batch;
  const members = detailQuery.data?.members ?? [];
  // The batch itself knows which Contract sub-menu it was started from —
  // drive navigation off that instead of a hardcoded path, so this page
  // works identically whether reached from New or Renewal.
  const basePath = batch?.kind === 'New' ? 'contract-new' : 'contract-renewal';

  usePageHeader(batch?.label ?? 'Contract', batch ? `${formatDate(batch.startDate)} – ${formatDate(batch.endDate)}` : null);

  const openPreview = (employeeId: number, mode?: 'view' | 'sign') => {
    const query = mode ? `?mode=${mode}` : '';
    navigate(`/hr/freelance-hiring/${basePath}/${employeeId}/preview${query}`);
  };

  const discardMutation = useMutation({
    mutationFn: (contractId: number) => hrApi.discardContract(contractId),
    onSuccess: () => {
      showToast('Draft discarded.', 'success');
      queryClient.invalidateQueries({ queryKey: detailQueryKey });
      queryClient.invalidateQueries({ queryKey: ['hr-contract-batches'] });
      setDiscardTarget(null);
    },
    onError: (err) => {
      showToast(getApiErrorMessage(err, 'Failed to discard this draft.'), 'error');
      setDiscardTarget(null);
    },
  });

  const handleDownload = async (m: HrContractBatchMember) => {
    try {
      const buffer = await hrApi.getContractPdfBytes(m.contract.id);
      const blob = new Blob([new Uint8Array(buffer)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${m.employeeFullNameEn}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to download contract.'), 'error');
    }
  };

  // Hidden-iframe trick — prints straight off the fetched PDF bytes without
  // depending on a popup/new-tab being allowed by the browser.
  const handlePrint = async (contractId: number) => {
    try {
      const buffer = await hrApi.getContractPdfBytes(contractId);
      const blob = new Blob([new Uint8Array(buffer)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      };
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to print contract.'), 'error');
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate(`/hr/freelance-hiring/${basePath}`)}>
            <ArrowLeft size={18} />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">{batch?.label ?? 'Contract'}</h1>
            {batch && (
              <p className="text-xs text-muted-foreground">
                {formatDate(batch.startDate)} – {formatDate(batch.endDate)} · {batch.employeeCount} employee
                {batch.employeeCount === 1 ? '' : 's'}
                {batch.approvalLetterUrl && (
                  <>
                    {' '}
                    ·{' '}
                    <a href={batch.approvalLetterUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      Approval Letter
                    </a>
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        <div className={DATA_TABLE_WRAPPER}>
          <div className="overflow-x-auto">
            <Table className={cn(DATA_TABLE_GRID, 'min-w-[900px]')}>
              <TableHeader>
                <TableRow className={DATA_TABLE_HEADER_ROW}>
                  <TableHead className={DATA_TABLE_HEAD}>Contract No.</TableHead>
                  <TableHead className={DATA_TABLE_HEAD}>Employee</TableHead>
                  <TableHead className={DATA_TABLE_HEAD}>Job Title</TableHead>
                  <TableHead className={DATA_TABLE_HEAD}>Department</TableHead>
                  <TableHead className={DATA_TABLE_HEAD}>Status</TableHead>
                  <TableHead className={cn(DATA_TABLE_HEAD, 'text-right')}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailQuery.isLoading && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {detailQuery.isError && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="text-center text-destructive py-10">
                      Failed to load this batch.
                    </TableCell>
                  </TableRow>
                )}
                {!detailQuery.isLoading && !detailQuery.isError && members.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-14">
                      <FileText size={22} className="mx-auto mb-2 text-muted-foreground/60" />
                      No employees in this batch.
                    </TableCell>
                  </TableRow>
                )}
                {members.map((m) => {
                  const { contract } = m;
                  const statusButton = (
                    <ActionIconButton
                      icon={CheckCircle2}
                      label="Status"
                      onClick={() => setStatusTarget(m)}
                    />
                  );

                  const moreMenu = (
                    <DropdownMenu key="more">
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="outline" className="h-8 w-8" aria-label="More actions">
                          <MoreVertical size={15} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setHistoryContractId(contract.id)} className="gap-2">
                          <History size={14} /> History
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(m)} className="gap-2">
                          <Download size={14} /> Download
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePrint(contract.id)} className="gap-2">
                          <Printer size={14} /> Print
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setVerifyContractId(contract.id)} className="gap-2">
                          <ShieldCheck size={14} /> Verify Document
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={contract.status !== 'AwaitingEmployeeSignature'}
                          onClick={() => setDiscardTarget(m)}
                          className="gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 size={14} /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );

                  return (
                    <TableRow key={m.employeeId} className={DATA_TABLE_ROW}>
                      <TableCell className="py-3 text-muted-foreground tabular-nums">{contract.applicationRef ?? '—'}</TableCell>
                      <TableCell className="py-3 font-medium text-foreground">
                        {bilingual(language, m.employeeFullNameEn, m.employeeFullNameAr)}
                      </TableCell>
                      <TableCell className="py-3">{bilingual(language, m.employeeJobTitleEn, m.employeeJobTitleAr)}</TableCell>
                      <TableCell className="py-3 text-muted-foreground">
                        {bilingual(language, m.employeeDepartmentNameEn, m.employeeDepartmentNameAr) || '—'}
                      </TableCell>
                      <TableCell className="py-3">
                        <StatusPill tone={CONTRACT_STATUS_TONE[contract.status] ?? 'muted'}>{CONTRACT_STATUS_LABEL[contract.status]}</StatusPill>
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <div className="flex justify-end gap-1.5 flex-wrap">
                          {contract.status === 'AwaitingEmployeeSignature' && (
                            <>
                              <ActionIconButton icon={PenLine} label="Edit" onClick={() => openPreview(m.employeeId)} />
                              <ActionIconButton icon={Eye} label="View" onClick={() => openPreview(m.employeeId, 'view')} />
                              <ActionIconButton icon={Send} label="Employee Signature" onClick={() => openPreview(m.employeeId, 'sign')} />
                              {statusButton}
                              {moreMenu}
                            </>
                          )}
                          {contract.status !== 'AwaitingEmployeeSignature' && (
                            <>
                              <ActionIconButton icon={Eye} label="View" onClick={() => openPreview(m.employeeId, 'view')} />
                              {statusButton}
                              {moreMenu}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <ConfirmActionModal
          open={!!discardTarget}
          onOpenChange={(open) => { if (!open) setDiscardTarget(null); }}
          title="Discard this draft?"
          description={
            discardTarget
              ? `This permanently deletes the in-progress contract draft for ${bilingual(
                  language,
                  discardTarget.employeeFullNameEn,
                  discardTarget.employeeFullNameAr
                )}. This cannot be undone — you'll start a brand-new contract from the template.`
              : ''
          }
          confirmText="Discard"
          variant="destructive"
          loading={discardMutation.isPending}
          onConfirm={() => {
            if (discardTarget) discardMutation.mutate(discardTarget.contract.id);
          }}
        />

        {statusTarget && (
          <ContractStatusModal
            open={!!statusTarget}
            onClose={() => setStatusTarget(null)}
            contract={statusTarget.contract}
            employee={{
              fullNameEn: statusTarget.employeeFullNameEn,
              fullNameAr: statusTarget.employeeFullNameAr,
              jobTitleEn: statusTarget.employeeJobTitleEn,
              jobTitleAr: statusTarget.employeeJobTitleAr,
              departmentNameEn: statusTarget.employeeDepartmentNameEn,
              departmentNameAr: statusTarget.employeeDepartmentNameAr,
            }}
          />
        )}

        {historyContractId && (
          <ContractHistoryModal
            open={!!historyContractId}
            onClose={() => setHistoryContractId(null)}
            contractId={historyContractId}
          />
        )}

        {verifyContractId && (
          <ContractVerifyUploadModal
            open={!!verifyContractId}
            onClose={() => setVerifyContractId(null)}
            contractId={verifyContractId}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
