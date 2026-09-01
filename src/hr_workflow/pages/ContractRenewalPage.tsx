import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search as SearchIcon,
  FileSignature,
  PenLine,
  Eye,
  Send,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Building2,
  Tag,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ListFilterBar, FilterActiveFiltersRow } from '@/components/ui/list-filter-bar';
import { ListPaginationBar, getInitialPage, getInitialPageSize } from '@/components/ui/list-pagination-bar';
import { ConfirmActionModal } from '@/admin/components/ConfirmActionModal';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { hrApi } from '../api/hrApi';
import { ActionIconButton } from '../components/ActionIconButton';
import { ContractStatusModal } from '../components/ContractStatusModal';
import { useHrLanguage, bilingual } from '../context/HrLanguageContext';
import { hrEmployeeStatusBadgeClass, formatDate, CONTRACT_STATUS_LABEL, CONTRACT_STATUS_BADGE_CLASS } from '../utils/hrUtils';
import type { HrContract, HrContractStatus, HrEmployee } from '../types/hrApi';

// The "Status" filter on this page is about renewal progress, not the
// employee's own HR status (that's a different, unrelated field) — so it
// filters HrContract.status via the backend's contractRenewalStatus param.
// 'NotStarted' is synthetic: no HrContract row exists for the employee yet.
const RENEWAL_STATUS_FILTER_OPTIONS: Array<HrContractStatus | 'NotStarted'> = [
  'NotStarted',
  'AwaitingEmployeeSignature',
  'AwaitingDepartmentHeadSignature',
  'AwaitingFinalSignature',
  'Completed',
  'Returned',
];
const RENEWAL_STATUS_FILTER_LABEL: Record<HrContractStatus | 'NotStarted', string> = {
  NotStarted: 'Not Started',
  ...CONTRACT_STATUS_LABEL,
};

const STORAGE_KEY = 'hr-contract-renewal';

export function ContractRenewalPage() {
  const { language, t } = useHrLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [discardTarget, setDiscardTarget] = useState<{ employeeId: number; contract: HrContract } | null>(null);
  const [statusTarget, setStatusTarget] = useState<{ employee: HrEmployee; contract: HrContract } | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(() => getInitialPage(STORAGE_KEY, 1));
  const [pageSize, setPageSize] = useState(() => getInitialPageSize(STORAGE_KEY, 10));

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, departmentFilter, statusFilter]);

  const handlePageSizeChange = (n: number) => {
    setPageSize(n);
    setPage(1);
  };

  const clearAllFilters = () => {
    setSearchInput('');
    setSearch('');
    setDepartmentFilter('all');
    setStatusFilter('all');
  };

  const hasActiveFilters = !!search.trim() || departmentFilter !== 'all' || statusFilter !== 'all';

  const departmentsQuery = useQuery({
    queryKey: ['hr-departments'],
    queryFn: hrApi.getDepartments,
    staleTime: 5 * 60 * 1000,
  });

  const employeesQuery = useQuery({
    queryKey: ['hr-employees', 'Freelance', search, departmentFilter, statusFilter, page, pageSize],
    queryFn: () =>
      hrApi.searchEmployees({
        contractType: 'Freelance',
        search: search || undefined,
        departmentId: departmentFilter !== 'all' ? Number(departmentFilter) : undefined,
        contractRenewalStatus: statusFilter !== 'all' ? (statusFilter as HrContractStatus | 'NotStarted') : undefined,
        page,
        pageSize,
      }),
    placeholderData: (prev) => prev,
  });

  const departments = departmentsQuery.data ?? [];
  const result = employeesQuery.data;
  const employees = result?.items ?? [];
  const total = result?.total ?? 0;
  const selectedDepartmentLabel = departments.find((d) => String(d.id) === departmentFilter);

  const employeeIds = employees.map((e) => e.id);
  const contractsQueryKey = ['hr-contracts-by-employees', employeeIds.join(',')];
  const contractsQuery = useQuery({
    queryKey: contractsQueryKey,
    queryFn: () => hrApi.getLatestContractsForEmployees(employeeIds),
    enabled: employeeIds.length > 0,
  });
  const contractsByEmployeeId = new Map((contractsQuery.data ?? []).map((c) => [c.employeeId, c]));

  const openPreview = (employeeId: number, mode?: 'view' | 'new' | 'sign') => {
    const query = mode ? `?mode=${mode}` : '';
    navigate(`/hr/freelance-hiring/contract-renewal/${employeeId}/preview${query}`);
  };

  const discardMutation = useMutation({
    mutationFn: (contractId: number) => hrApi.discardContract(contractId),
    onSuccess: () => {
      showToast('Draft discarded.', 'success');
      queryClient.invalidateQueries({ queryKey: contractsQueryKey });
      setDiscardTarget(null);
    },
    onError: (err) => {
      showToast(getApiErrorMessage(err, 'Failed to discard this draft.'), 'error');
      setDiscardTarget(null);
    },
  });

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('contractRenewal')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('contractRenewalSubtitle')}</p>
      </div>

      <ListFilterBar
        activeFiltersRow={
          hasActiveFilters ? (
            <FilterActiveFiltersRow onClearAll={clearAllFilters}>
              {departmentFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  <Building2 size={12} />
                  {selectedDepartmentLabel ? bilingual(language, selectedDepartmentLabel.nameEn, selectedDepartmentLabel.nameAr) : departmentFilter}
                  <button
                    type="button"
                    onClick={() => setDepartmentFilter('all')}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full"
                    aria-label="Remove department filter"
                  >
                    <X size={12} />
                  </button>
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  <Tag size={12} />
                  {RENEWAL_STATUS_FILTER_LABEL[statusFilter as HrContractStatus | 'NotStarted']}
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full"
                    aria-label="Remove status filter"
                  >
                    <X size={12} />
                  </button>
                </Badge>
              )}
              {search.trim() && (
                <Badge variant="secondary" className="gap-1">
                  <SearchIcon size={12} />
                  &quot;{search}&quot;
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full"
                    aria-label="Remove search"
                  >
                    <X size={12} />
                  </button>
                </Badge>
              )}
            </FilterActiveFiltersRow>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t('searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('department')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allDepartments')}</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {bilingual(language, d.nameEn, d.nameAr)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allStatuses')}</SelectItem>
              {RENEWAL_STATUS_FILTER_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {RENEWAL_STATUS_FILTER_LABEL[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </ListFilterBar>

      <ListPaginationBar
        currentPage={page}
        totalItems={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        storageKey={STORAGE_KEY}
        disabled={employeesQuery.isLoading}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('employee')}</TableHead>
                <TableHead>{t('jobTitle')}</TableHead>
                <TableHead>{t('department')}</TableHead>
                <TableHead>{t('qid')}</TableHead>
                <TableHead>{t('joinDate')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('contractRenewal')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeesQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    {t('loading')}
                  </TableCell>
                </TableRow>
              )}
              {employeesQuery.isError && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-destructive py-10">
                    {t('errorLoading')}
                  </TableCell>
                </TableRow>
              )}
              {!employeesQuery.isLoading && !employeesQuery.isError && employees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium text-foreground">
                    {bilingual(language, emp.fullNameEn, emp.fullNameAr)}
                  </TableCell>
                  <TableCell>{bilingual(language, emp.jobTitleEn, emp.jobTitleAr)}</TableCell>
                  <TableCell>{bilingual(language, emp.departmentNameEn, emp.departmentNameAr)}</TableCell>
                  <TableCell className="tabular-nums">{emp.qid}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {emp.joinDate ? formatDate(emp.joinDate) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge className={hrEmployeeStatusBadgeClass(emp.status)}>{emp.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {contractsByEmployeeId.has(emp.id) ? (
                      <Badge className={CONTRACT_STATUS_BADGE_CLASS[contractsByEmployeeId.get(emp.id)!.status]}>
                        {CONTRACT_STATUS_LABEL[contractsByEmployeeId.get(emp.id)!.status]}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not started</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5 flex-wrap">
                      {(() => {
                        const contract = contractsByEmployeeId.get(emp.id);

                        if (!contract) {
                          return (
                            <ActionIconButton
                              icon={FileSignature}
                              label={t('renewContract')}
                              variant="default"
                              onClick={() => openPreview(emp.id)}
                            />
                          );
                        }

                        const statusButton = (
                          <ActionIconButton
                            icon={CheckCircle2}
                            label="Status"
                            onClick={() => setStatusTarget({ employee: emp, contract })}
                          />
                        );

                        if (contract.status === 'AwaitingEmployeeSignature') {
                          return (
                            <>
                              <ActionIconButton icon={PenLine} label="Edit" onClick={() => openPreview(emp.id)} />
                              <ActionIconButton icon={Eye} label="View" onClick={() => openPreview(emp.id, 'view')} />
                              <ActionIconButton
                                icon={Send}
                                label="Employee Signature"
                                onClick={() => openPreview(emp.id, 'sign')}
                              />
                              {statusButton}
                              <ActionIconButton
                                icon={Trash2}
                                label="Discard"
                                destructive
                                onClick={() => setDiscardTarget({ employeeId: emp.id, contract })}
                              />
                            </>
                          );
                        }

                        if (contract.status === 'Completed' || contract.status === 'Returned') {
                          return (
                            <>
                              <ActionIconButton icon={Eye} label="View" onClick={() => openPreview(emp.id, 'view')} />
                              {statusButton}
                              <ActionIconButton
                                icon={RefreshCw}
                                label="Start New Renewal"
                                onClick={() => openPreview(emp.id, 'new')}
                              />
                            </>
                          );
                        }

                        // AwaitingDepartmentHeadSignature / AwaitingFinalSignature —
                        // already past the coordinator's stage, nothing to edit or
                        // discard here.
                        return (
                          <>
                            <ActionIconButton icon={Eye} label="View" onClick={() => openPreview(emp.id, 'view')} />
                            {statusButton}
                          </>
                        );
                      })()}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!employeesQuery.isLoading && !employeesQuery.isError && employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    {t('noResults')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmActionModal
        open={!!discardTarget}
        onOpenChange={(open) => { if (!open) setDiscardTarget(null); }}
        title="Discard this draft?"
        description={
          discardTarget
            ? `This permanently deletes the in-progress contract draft for ${bilingual(
                language,
                employees.find((e) => e.id === discardTarget.employeeId)?.fullNameEn ?? '',
                employees.find((e) => e.id === discardTarget.employeeId)?.fullNameAr ?? ''
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
          employee={statusTarget.employee}
        />
      )}
    </div>
    </TooltipProvider>
  );
}
