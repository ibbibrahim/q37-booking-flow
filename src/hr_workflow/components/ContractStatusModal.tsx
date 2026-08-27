import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useHrLanguage, bilingual } from '../context/HrLanguageContext';
import { formatDate } from '../utils/hrUtils';
import type { HrContract, HrContractStatus, HrEmployee } from '../types/hrApi';

interface Props {
  open: boolean;
  onClose: () => void;
  contract: HrContract;
  employee: HrEmployee;
}

const STAGE_ORDER: HrContractStatus[] = [
  'AwaitingEmployeeSignature',
  'AwaitingDepartmentHeadSignature',
  'AwaitingFinalSignature',
  'Completed',
];

const STAGE_LABELS: Record<HrContractStatus, string> = {
  AwaitingEmployeeSignature: 'Employee',
  AwaitingDepartmentHeadSignature: 'Department Head',
  AwaitingFinalSignature: 'GM Signature',
  Completed: 'Completed',
  Returned: 'Returned',
};

const STATUS_BADGE_CLASS: Record<HrContractStatus, string> = {
  AwaitingEmployeeSignature: 'border-transparent bg-warning/15 text-warning',
  AwaitingDepartmentHeadSignature: 'border-transparent bg-warning/15 text-warning',
  AwaitingFinalSignature: 'border-transparent bg-warning/15 text-warning',
  Completed: 'border-transparent bg-success/15 text-success',
  Returned: 'border-transparent bg-destructive/15 text-destructive',
};

const STATUS_LABEL: Record<HrContractStatus, string> = {
  AwaitingEmployeeSignature: 'Awaiting Employee Signature',
  AwaitingDepartmentHeadSignature: 'Awaiting Department Head',
  AwaitingFinalSignature: 'Awaiting GM Signature',
  Completed: 'Completed',
  Returned: 'Returned',
};

const ROLE_LABELS: Record<string, string> = {
  Employee: 'Employee',
  DepartmentHead: 'Department Head',
  FinalSignatory: 'GM',
};

const METHOD_LABELS: Record<string, string> = {
  Draw: 'drew',
  Type: 'typed',
  Upload: 'uploaded',
};

/** Status-tracker view for a contract — a horizontal stage stepper plus a
 * signature/history timeline, styled after the existing Hiring Request
 * tracker so the two workflows feel like one product. */
export function ContractStatusModal({ open, onClose, contract, employee }: Props) {
  const { language } = useHrLanguage();

  if (!open) return null;

  const currentIndex = STAGE_ORDER.indexOf(contract.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-foreground">Contract #{contract.id}</h3>
                <Badge className={STATUS_BADGE_CLASS[contract.status]}>{STATUS_LABEL[contract.status]}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {bilingual(language, employee.fullNameEn, employee.fullNameAr)} ·{' '}
                {bilingual(language, employee.jobTitleEn, employee.jobTitleAr)} ·{' '}
                {bilingual(language, employee.departmentNameEn, employee.departmentNameAr)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 h-8 w-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:bg-muted"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto space-y-6">
          {/* Stepper */}
          <div className="flex items-center overflow-x-auto pb-2">
            {STAGE_ORDER.map((stage, i) => {
              const isDone = i < currentIndex || contract.status === 'Completed' && i < STAGE_ORDER.length - 1;
              const isCurrent = i === currentIndex;
              return (
                <div key={stage} className="flex items-center shrink-0">
                  <div className="flex flex-col items-center gap-1.5 w-24">
                    <div
                      className={
                        'h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 ' +
                        (isDone
                          ? 'bg-success border-success text-white'
                          : isCurrent
                          ? 'border-primary text-primary bg-primary/10'
                          : 'border-border text-muted-foreground bg-muted')
                      }
                    >
                      {isDone ? <Check size={18} /> : i + 1}
                    </div>
                    <span
                      className={
                        'text-[11px] text-center leading-tight ' +
                        (isDone || isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground')
                      }
                    >
                      {STAGE_LABELS[stage]}
                    </span>
                  </div>
                  {i < STAGE_ORDER.length - 1 && (
                    <div className={'h-0.5 w-8 shrink-0 -mt-5 ' + (isDone ? 'bg-success' : 'bg-border')} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-muted/40 rounded-lg p-4">
            <div>
              <p className="text-xs text-muted-foreground">Employee</p>
              <p className="text-sm font-medium text-foreground">{bilingual(language, employee.fullNameEn, employee.fullNameAr)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-sm font-medium text-foreground">{formatDate(contract.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Contract Type</p>
              <p className="text-sm font-medium text-foreground">Renewal</p>
            </div>
          </div>

          {/* History */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground tracking-wide mb-2">SIGNATURES &amp; HISTORY</p>
            <ul className="space-y-3">
              <li className="flex gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">Contract prepared</p>
                  <p className="text-xs text-muted-foreground">{formatDate(contract.createdAt)} · Sent for employee signature</p>
                </div>
              </li>
              {contract.signatures.map((s) => (
                <li key={s.id} className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-success shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">{s.signedByName} ({ROLE_LABELS[s.role] ?? s.role})</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(s.signedAt)} · Signed — {METHOD_LABELS[s.signatureMethod] ?? s.signatureMethod} their signature
                    </p>
                  </div>
                </li>
              ))}
              {contract.status !== 'Completed' && (
                <li className="flex gap-2.5 opacity-60">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-border shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Awaiting {STAGE_LABELS[contract.status]}</p>
                    <p className="text-xs text-muted-foreground">Next step in the signing chain</p>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
