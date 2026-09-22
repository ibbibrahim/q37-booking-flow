import { useQuery } from '@tanstack/react-query';
import { Users, UserCheck, Briefcase, Building2 } from 'lucide-react';
import { StatTile } from '../components/StatTile';
import { NationalityPieChart } from '../components/charts/NationalityPieChart';
import { DepartmentHeadcountChart } from '../components/charts/DepartmentHeadcountChart';
import { AgeDistributionChart } from '../components/charts/AgeDistributionChart';
import { FreelanceSpendChart } from '../components/charts/FreelanceSpendChart';
import { LeaveSummaryCard } from '../components/LeaveSummaryCard';
import { hrApi } from '../api/hrApi';
import { useHrLanguage } from '../context/HrLanguageContext';

export function HRDashboardPage() {
  const { t } = useHrLanguage();

  const departmentsQuery = useQuery({
    queryKey: ['hr-departments'],
    queryFn: hrApi.getDepartments,
    staleTime: 5 * 60 * 1000,
  });

  // Every employee, both contract types — large pageSize since this is a dashboard
  // rollup, not a paginated list.
  const employeesQuery = useQuery({
    queryKey: ['hr-employees-dashboard'],
    queryFn: () => hrApi.searchEmployees({ page: 1, pageSize: 2000 }),
  });

  const departments = departmentsQuery.data ?? [];
  const allEmployees = employeesQuery.data?.items ?? [];
  const activeEmployees = allEmployees.filter((e) => e.status === 'Active');

  const permanentCount = activeEmployees.filter((e) => e.contractType === 'Permanent').length;
  const freelanceCount = activeEmployees.filter((e) => e.contractType === 'Freelance').length;

  const isLoading = departmentsQuery.isLoading || employeesQuery.isLoading;
  const isError = departmentsQuery.isError || employeesQuery.isError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-16 text-muted-foreground">{t('errorLoading')}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('hrDashboard')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('hrDashboardSubtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile label={t('totalHeadcount')} value={activeEmployees.length} icon={Users} hint={t('activeEmployees')} />
        <StatTile
          label={t('permanent')}
          value={permanentCount}
          icon={UserCheck}
          hint={`${activeEmployees.length ? Math.round((permanentCount / activeEmployees.length) * 100) : 0}% ${t('ofWorkforce')}`}
        />
        <StatTile
          label={t('freelance')}
          value={freelanceCount}
          icon={Briefcase}
          hint={`${activeEmployees.length ? Math.round((freelanceCount / activeEmployees.length) * 100) : 0}% ${t('ofWorkforce')}`}
          accentClassName="bg-violet-500/15 text-violet-600 dark:text-violet-300"
        />
        <StatTile
          label={t('totalDepartments')}
          value={departments.length}
          icon={Building2}
          hint={t('acrossQbc')}
          accentClassName="bg-success/15 text-success"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <DepartmentHeadcountChart employees={activeEmployees} departments={departments} />
        </div>
        <NationalityPieChart employees={activeEmployees} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <AgeDistributionChart employees={activeEmployees} />
        </div>
        <LeaveSummaryCard employees={allEmployees} />
      </div>

      <FreelanceSpendChart employees={activeEmployees} departments={departments} />
    </div>
  );
}
