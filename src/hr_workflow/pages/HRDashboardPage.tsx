import { useQuery } from '@tanstack/react-query';
import { Users, UserCheck, Briefcase, Building2, UserPlus, AlertTriangle, CreditCard, FileText } from 'lucide-react';
import { StatTile } from '../components/StatTile';
import { SplitStatCard } from '../components/SplitStatCard';
import { NationalityPieChart } from '../components/charts/NationalityPieChart';
import { DepartmentHeadcountChart } from '../components/charts/DepartmentHeadcountChart';
import { AgeDistributionChart } from '../components/charts/AgeDistributionChart';
import { FreelanceSpendChart } from '../components/charts/FreelanceSpendChart';
import { LeaveSummaryCard } from '../components/LeaveSummaryCard';
import { hrApi } from '../api/hrApi';
import { useHrLanguage } from '../context/HrLanguageContext';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useAuth } from '@/contexts/AuthContext';

/** Good morning/afternoon/evening — purely time-of-day, no timezone handling
 * beyond the browser's local clock (this is an internal office dashboard). */
function greetingKey(): 'goodMorning' | 'goodAfternoon' | 'goodEvening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'goodMorning';
  if (hour < 18) return 'goodAfternoon';
  return 'goodEvening';
}

export function HRDashboardPage() {
  const { t } = useHrLanguage();
  const { user } = useAuth();
  usePageHeader(t('hrDashboard'), t('hrDashboardSubtitle'));
  const greetingName = user?.displayName || user?.username;

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

  // DUMMY — placeholder values until "Total Hired" has a real tracked
  // source. There's no "hired as Permanent" vs "hired as Freelance" split
  // anywhere in the app today: the New Freelancer Hiring workflow only ever
  // produces Freelance conversions, and there's no equivalent Permanent-
  // hiring workflow to source a real Permanent count from. Deliberately
  // round/made-up numbers (not derived from real data) so this doesn't look
  // like a real computed figure — swap in a real query once that exists.
  const totalHiredCount = 8;
  const dummyPermanentHired = 3;
  const dummyFreelanceHired = 5;

  // DUMMY — "QID/Passport Expiring Soon" (next 30 days). The real version
  // of this is straightforward: qidExpiry/passportExpiry already exist on
  // every employee record, this just needs a date-window filter over
  // activeEmployees. Left as placeholder numbers until the exact window
  // (30 vs 60 days) is confirmed.
  const dummyPassportExpiring = 4;
  const dummyQidExpiring = 2;
  const dummyDocsExpiringTotal = dummyPassportExpiring + dummyQidExpiring;

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
      <div className="rounded-xl border border-warning/20 bg-warning/5 px-5 py-4">
        <p className="text-lg font-semibold text-foreground">
          {t(greetingKey())}{greetingName ? `, ${greetingName}` : ''}
          <span className="ml-1.5" aria-hidden="true">👋</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        <SplitStatCard
          label={t('totalHeadcount')}
          value={activeEmployees.length}
          icon={Users}
          hint={t('activeEmployees')}
          rows={[
            { label: t('permanent'), value: permanentCount, icon: UserCheck, to: '/hr/employees/permanent' },
            { label: t('freelance'), value: freelanceCount, icon: Briefcase, accentClassName: 'text-violet-600 dark:text-violet-300', to: '/hr/employees/freelance' },
          ]}
        />
        <SplitStatCard
          label={t('totalHired')}
          value={totalHiredCount}
          icon={UserPlus}
          hint={t('viaHiringWorkflow')}
          accentClassName="bg-blue-500/15 text-blue-600 dark:text-blue-300"
          rows={[
            { label: t('permanent'), value: dummyPermanentHired, icon: UserCheck },
            { label: t('freelance'), value: dummyFreelanceHired, icon: Briefcase, accentClassName: 'text-violet-600 dark:text-violet-300' },
          ]}
        />
        <SplitStatCard
          label={t('docsExpiringSoon')}
          value={dummyDocsExpiringTotal}
          icon={AlertTriangle}
          hint={t('next30Days')}
          accentClassName="bg-warning/15 text-warning"
          rows={[
            { label: t('passport'), value: dummyPassportExpiring, icon: FileText },
            { label: t('qid'), value: dummyQidExpiring, icon: CreditCard, accentClassName: 'text-warning' },
          ]}
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
