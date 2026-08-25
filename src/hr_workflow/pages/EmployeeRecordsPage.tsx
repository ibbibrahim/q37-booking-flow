import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search as SearchIcon, Users, UserCheck, Phone, Mail, Tag, Building2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ListFilterBar, FilterActiveFiltersRow } from '@/components/ui/list-filter-bar';
import { ListPaginationBar, getInitialPage, getInitialPageSize } from '@/components/ui/list-pagination-bar';
import { StatTile } from '../components/StatTile';
import { hrApi } from '../api/hrApi';
import { useHrLanguage, bilingual } from '../context/HrLanguageContext';
import { hrEmployeeStatusBadgeClass, formatDate } from '../utils/hrUtils';
import type { HrContractType, HrEmployeeStatus } from '../types/hrApi';

interface Props {
  contractType: HrContractType;
}

export function EmployeeRecordsPage({ contractType }: Props) {
  const { language, t } = useHrLanguage();
  const navigate = useNavigate();

  const typeSlug = contractType.toLowerCase();
  const storageKey = `hr-employees:${typeSlug}`;

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(() => getInitialPage(storageKey, 1));
  const [pageSize, setPageSize] = useState(() => getInitialPageSize(storageKey, 10));

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, departmentFilter, statusFilter, contractType]);

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
    queryKey: ['hr-employees', contractType, search, departmentFilter, statusFilter, page, pageSize],
    queryFn: () =>
      hrApi.searchEmployees({
        contractType,
        search: search || undefined,
        departmentId: departmentFilter !== 'all' ? Number(departmentFilter) : undefined,
        status: statusFilter !== 'all' ? (statusFilter as HrEmployeeStatus) : undefined,
        page,
        pageSize,
      }),
    placeholderData: (prev) => prev,
  });

  // Separate, unpaginated fetch (same filters) so the summary tiles reflect every
  // matching record, not just the 10 (or however many) shown on the current page.
  const statsQuery = useQuery({
    queryKey: ['hr-employees-stats', contractType, search, departmentFilter, statusFilter],
    queryFn: () =>
      hrApi.searchEmployees({
        contractType,
        search: search || undefined,
        departmentId: departmentFilter !== 'all' ? Number(departmentFilter) : undefined,
        status: statusFilter !== 'all' ? (statusFilter as HrEmployeeStatus) : undefined,
        page: 1,
        pageSize: 1000,
      }),
    placeholderData: (prev) => prev,
  });

  const departments = departmentsQuery.data ?? [];
  const result = employeesQuery.data;
  const employees = result?.items ?? [];
  const total = result?.total ?? 0;
  const selectedDepartmentLabel = departments.find((d) => String(d.id) === departmentFilter);

  const statsEmployees = statsQuery.data?.items ?? [];
  const activeCount = statsEmployees.filter((e) => e.status === 'Active').length;
  const onLeaveCount = statsEmployees.filter((e) => e.status === 'On Leave').length;
  const qatariCount = statsEmployees.filter((e) => e.isQatari).length;

  const isPermanent = contractType === 'Permanent';
  const columnCount = isPermanent ? 10 : 7;

  const heading = isPermanent ? t('permanentEmployees') : t('freelanceEmployees');
  const subtitle = isPermanent ? t('permanentSubtitle') : t('freelanceSubtitle');

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{heading}</h1>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <Button onClick={() => navigate(`/hr/employees/${typeSlug}/new`)}>
          <Plus size={16} className="mr-1" /> {t('addEmployee')}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile label={t('total')} value={total} icon={contractType === 'Permanent' ? UserCheck : Users} />
        <StatTile label={t('active')} value={activeCount} icon={UserCheck} accentClassName="bg-success/15 text-success" />
        <StatTile label={t('onLeave')} value={onLeaveCount} icon={Users} accentClassName="bg-warning/15 text-warning" />
        {contractType === 'Permanent' && (
          <StatTile label={t('qatariNationals')} value={qatariCount} icon={Users} />
        )}
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
                  {statusFilter}
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
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="On Leave">On Leave</SelectItem>
              <SelectItem value="External Secondment">External Secondment</SelectItem>
              <SelectItem value="Retired">Retired</SelectItem>
              <SelectItem value="End of Service">End of Service</SelectItem>
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
        storageKey={storageKey}
        disabled={employeesQuery.isLoading}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('employee')}</TableHead>
                {isPermanent && <TableHead>{t('jobNumberQmc')}</TableHead>}
                <TableHead>{t('jobTitle')}</TableHead>
                <TableHead>{t('department')}</TableHead>
                <TableHead>{t('contact')}</TableHead>
                {isPermanent && <TableHead>{t('joinDate')}</TableHead>}
                <TableHead>{t('qid')}</TableHead>
                {isPermanent && <TableHead>{t('nationality')}</TableHead>}
                <TableHead>{t('status')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeesQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={columnCount} className="text-center text-muted-foreground py-10">
                    {t('loading')}
                  </TableCell>
                </TableRow>
              )}
              {employeesQuery.isError && (
                <TableRow>
                  <TableCell colSpan={columnCount} className="text-center text-destructive py-10">
                    {t('errorLoading')}
                  </TableCell>
                </TableRow>
              )}
              {!employeesQuery.isLoading && !employeesQuery.isError && employees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium text-foreground">
                    {bilingual(language, emp.fullNameEn, emp.fullNameAr)}
                    {emp.recentlyConvertedToPermanent && (
                      <Badge className="ml-2 border-transparent bg-yellow-400/20 text-yellow-700 dark:text-yellow-300">
                        Freelance → Permanent
                      </Badge>
                    )}
                  </TableCell>
                  {isPermanent && <TableCell className="text-muted-foreground">{emp.qmcJobNo || '—'}</TableCell>}
                  <TableCell>{bilingual(language, emp.jobTitleEn, emp.jobTitleAr)}</TableCell>
                  <TableCell>{bilingual(language, emp.departmentNameEn, emp.departmentNameAr)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                      {emp.mobileNumber && (
                        <span className="flex items-center gap-1"><Phone size={12} />{emp.mobileNumber}</span>
                      )}
                      {emp.emailWork && (
                        <span className="flex items-center gap-1"><Mail size={12} />{emp.emailWork}</span>
                      )}
                    </div>
                  </TableCell>
                  {isPermanent && (
                    <TableCell className="text-muted-foreground">
                      {emp.joinDate ? formatDate(emp.joinDate) : '—'}
                    </TableCell>
                  )}
                  <TableCell className="tabular-nums">{emp.qid}</TableCell>
                  {isPermanent && <TableCell>{emp.nationality}</TableCell>}
                  <TableCell>
                    <Badge className={hrEmployeeStatusBadgeClass(emp.status)}>{emp.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/hr/employees/${typeSlug}/${emp.id}`)}>
                        {t('view')}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/hr/employees/${typeSlug}/${emp.id}/edit`)}>
                        {t('edit')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!employeesQuery.isLoading && !employeesQuery.isError && employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columnCount} className="text-center text-muted-foreground py-10">
                    {t('noResults')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
