import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Search, Upload, Loader2, FileText, CalendarRange, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { hrApi } from '../api/hrApi';
import { fillContractTemplate, applyCoordinatorFields, withContractDateFields } from '../utils/contractPdf';
import { useHrLanguage, bilingual } from '../context/HrLanguageContext';

// A contract is "in progress" (not eligible to start a fresh one) once it's
// left the coordinator's hands — these are the only statuses that should
// block this employee from showing up in the picker.
const IN_PROGRESS_STATUSES = new Set(['AwaitingDepartmentHeadSignature', 'AwaitingFinalSignature']);

interface Props {
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

/** HRAdmin's single entry point for starting a new contract renewal — one
 * shared Start Date / End Date / Approval Letter, applied across however
 * many employees are selected (everyone eligible is checked by default). */
export function StartContractRenewalModal({ open, onClose, onCompleted }: Props) {
  const { language } = useHrLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [approvalLetter, setApprovalLetter] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; name: string } | null>(null);
  const defaultedRef = useRef(false);
  const prevOpenRef = useRef(false);
  const fileInputId = useRef(`approval-letter-${Math.random().toString(36).slice(2)}`).current;

  // Reset the instant the modal opens, synchronously during render rather
  // than in an effect — guarantees this flag is already false before the
  // default-selection effect below evaluates it in the same commit,
  // regardless of effect declaration/run order.
  if (open && !prevOpenRef.current) {
    defaultedRef.current = false;
  }
  prevOpenRef.current = open;

  // Reset to a blank slate every time the modal is (re)opened rather than
  // carrying stale selections/dates from a previous run.
  useEffect(() => {
    if (!open) return;
    setStartDate('');
    setEndDate('');
    setApprovalLetter(null);
    setSearch('');
    setDepartmentFilter('all');
    setSelectedIds(new Set());
    setProcessing(false);
    setProgress(null);
  }, [open]);

  const departmentsQuery = useQuery({
    queryKey: ['hr-departments'],
    queryFn: hrApi.getDepartments,
    staleTime: 5 * 60 * 1000,
  });

  const poolQuery = useQuery({
    queryKey: ['hr-contract-renewal-pool'],
    queryFn: () => hrApi.searchEmployees({ contractType: 'Freelance', page: 1, pageSize: 500 }),
    enabled: open,
    staleTime: 60 * 1000,
  });

  const poolEmployees = useMemo(() => poolQuery.data?.items ?? [], [poolQuery.data]);
  const poolIds = useMemo(() => poolEmployees.map((e) => e.id), [poolEmployees]);

  const contractsQuery = useQuery({
    queryKey: ['hr-contracts-by-employees', poolIds.join(',')],
    queryFn: () => hrApi.getLatestContractsForEmployees(poolIds),
    enabled: open && poolIds.length > 0,
  });

  const latestByEmployeeId = useMemo(
    () => new Map((contractsQuery.data ?? []).map((c) => [c.employeeId, c])),
    [contractsQuery.data]
  );

  const eligibleEmployees = useMemo(
    () =>
      poolEmployees.filter((e) => {
        const latest = latestByEmployeeId.get(e.id);
        return !latest || !IN_PROGRESS_STATUSES.has(latest.status);
      }),
    [poolEmployees, latestByEmployeeId]
  );

  // Default every eligible employee to checked — once, as soon as the
  // eligible set is known — matching "all selected by default, unselect if
  // any" from how this was originally described.
  useEffect(() => {
    if (!open || defaultedRef.current || eligibleEmployees.length === 0) return;
    setSelectedIds(new Set(eligibleEmployees.map((e) => e.id)));
    defaultedRef.current = true;
  }, [open, eligibleEmployees]);

  const visibleEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return eligibleEmployees.filter((e) => {
      const matchesDepartment = departmentFilter === 'all' || String(e.departmentId) === departmentFilter;
      const matchesSearch =
        !q ||
        e.fullNameEn.toLowerCase().includes(q) ||
        e.fullNameAr.toLowerCase().includes(q) ||
        (e.departmentNameEn ?? '').toLowerCase().includes(q);
      return matchesDepartment && matchesSearch;
    });
  }, [eligibleEmployees, search, departmentFilter]);

  const allVisibleSelected = visibleEmployees.length > 0 && visibleEmployees.every((e) => selectedIds.has(e.id));

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleEmployees.forEach((e) => next.delete(e.id));
      } else {
        visibleEmployees.forEach((e) => next.add(e.id));
      }
      return next;
    });
  };

  const selectedEmployees = eligibleEmployees.filter((e) => selectedIds.has(e.id));
  const canSubmit = !!startDate && !!endDate && selectedEmployees.length > 0 && !processing;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setProcessing(true);
    try {
      // One renewal header per submission — carries the shared term and
      // uploads the approval letter exactly once, instead of re-uploading
      // the same file for every employee. Every contract created below
      // links back to it, so this run stays visible/trackable as a unit.
      const batch = await hrApi.createContractBatch(
        new Date(startDate).toISOString(),
        new Date(endDate).toISOString(),
        selectedEmployees.length,
        approvalLetter ?? undefined
      );

      for (let i = 0; i < selectedEmployees.length; i++) {
        const emp = selectedEmployees[i];
        setProgress({ done: i, total: selectedEmployees.length, name: bilingual(language, emp.fullNameEn, emp.fullNameAr) });

        const baseBytes = await fillContractTemplate(emp);
        const dateValues = withContractDateFields({}, { startDateIso: startDate, endDateIso: endDate });
        const bytes = await applyCoordinatorFields(baseBytes, dateValues);
        const blob = new Blob([bytes], { type: 'application/pdf' });

        await hrApi.createContract(emp.id, blob, { batchId: batch.id });
      }

      queryClient.invalidateQueries({ queryKey: ['hr-contracts-by-employees'] });
      queryClient.invalidateQueries({ queryKey: ['hr-contract-batches'] });
      showToast(
        selectedEmployees.length === 1
          ? 'Contract renewal started.'
          : `Contract renewal started for ${selectedEmployees.length} employees.`,
        'success'
      );
      onCompleted();
      onClose();

      if (selectedEmployees.length === 1) {
        navigate(`/hr/freelance-hiring/contract-renewal/${selectedEmployees[0].id}/preview`);
      }
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to start contract renewal.'), 'error');
    } finally {
      setProcessing(false);
      setProgress(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground tracking-tight">Start Contract Renewal</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Set one contract term and apply it across every employee you select below.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="shrink-0 h-8 w-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Term */}
          <div className="px-6 py-5 border-b border-border space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <CalendarRange size={13} /> Contract Term
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="batch-start-date" className="text-xs text-muted-foreground">Start Date</Label>
                <Input
                  id="batch-start-date" type="date" value={startDate}
                  onChange={(e) => setStartDate(e.target.value)} disabled={processing}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="batch-end-date" className="text-xs text-muted-foreground">End Date</Label>
                <Input
                  id="batch-end-date" type="date" value={endDate}
                  onChange={(e) => setEndDate(e.target.value)} disabled={processing}
                />
              </div>
            </div>
            <div>
              <input
                id={fileInputId} type="file" accept="application/pdf,image/*" className="hidden"
                onChange={(e) => setApprovalLetter(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button" variant="outline" size="sm" className="gap-1.5"
                disabled={processing}
                onClick={() => document.getElementById(fileInputId)?.click()}
              >
                <Upload size={13} />
                <span className="truncate max-w-[220px]">
                  {approvalLetter ? approvalLetter.name : 'Approval Letter (optional)'}
                </span>
              </Button>
            </div>
          </div>

          {/* Employees */}
          <div className="px-6 py-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Users size={13} /> Employees
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {selectedEmployees.length} of {eligibleEmployees.length} selected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr,200px] gap-2 mb-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9 h-9"
                  placeholder="Search employees…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  disabled={processing}
                />
              </div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter} disabled={processing}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {(departmentsQuery.data ?? []).map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {bilingual(language, d.nameEn, d.nameAr)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={toggleAllVisible}
                disabled={processing || visibleEmployees.length === 0}
                className="w-full flex items-center gap-3 px-3.5 py-2 bg-muted/40 border-b border-border text-left disabled:opacity-50"
              >
                <Checkbox checked={allVisibleSelected} className="pointer-events-none" />
                <span className="text-xs font-medium text-muted-foreground">
                  {allVisibleSelected ? 'Unselect all' : 'Select all'}
                </span>
              </button>

              <div className="max-h-64 overflow-y-auto divide-y divide-border">
                {poolQuery.isLoading && (
                  <p className="px-3.5 py-6 text-center text-sm text-muted-foreground">Loading…</p>
                )}
                {!poolQuery.isLoading && visibleEmployees.length === 0 && (
                  <p className="px-3.5 py-6 text-center text-sm text-muted-foreground">No employees found.</p>
                )}
                {visibleEmployees.map((emp) => {
                  const checked = selectedIds.has(emp.id);
                  const latest = latestByEmployeeId.get(emp.id);
                  return (
                    <label
                      key={emp.id}
                      className={cn(
                        'flex items-center gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-muted/40',
                        processing && 'pointer-events-none opacity-60'
                      )}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggleOne(emp.id)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate">
                          {bilingual(language, emp.fullNameEn, emp.fullNameAr)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {bilingual(language, emp.departmentNameEn, emp.departmentNameAr)}
                        </p>
                      </div>
                      {latest && (latest.status === 'Completed' || latest.status === 'Returned') && (
                        <span className="text-[11px] text-muted-foreground shrink-0">Renewal</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 min-w-0">
            {processing && progress && (
              <>
                <Loader2 size={13} className="animate-spin shrink-0" />
                <span className="truncate">
                  Creating {progress.done + 1} of {progress.total} — {progress.name}
                </span>
              </>
            )}
            {!processing && (
              <>
                <FileText size={13} className="shrink-0" />
                <span>Each employee gets their own auto-filled contract document.</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={processing}>
              Cancel
            </Button>
            <Button type="button" size="sm" className="gap-1.5" disabled={!canSubmit} onClick={handleSubmit}>
              {processing && <Loader2 size={13} className="animate-spin" />}
              {processing
                ? 'Starting…'
                : selectedEmployees.length > 1
                ? `Start Renewal for ${selectedEmployees.length}`
                : 'Start Renewal'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
