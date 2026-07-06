import { Users, UserCheck, Briefcase, Globe2 } from 'lucide-react';
import { StatTile } from '../components/StatTile';
import { NationalityPieChart } from '../components/charts/NationalityPieChart';
import { DepartmentHeadcountChart } from '../components/charts/DepartmentHeadcountChart';
import { AgeDistributionChart } from '../components/charts/AgeDistributionChart';
import { FreelanceSpendChart } from '../components/charts/FreelanceSpendChart';
import { LeaveSummaryCard } from '../components/LeaveSummaryCard';
import { employees } from '../data/employeesSeed';

export function HRDashboardPage() {
  const activeEmployees = employees.filter((e) => e.status === 'Active');
  const permanentCount = activeEmployees.filter((e) => e.contractType === 'Permanent').length;
  const freelanceCount = activeEmployees.filter((e) => e.contractType === 'Freelance').length;
  const qatariCount = activeEmployees.filter((e) => e.isQatari).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">HR Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Headcount, workforce composition, leave and freelance cost overview
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile label="Total Headcount" value={activeEmployees.length} icon={Users} hint="Active employees" />
        <StatTile
          label="Permanent"
          value={permanentCount}
          icon={UserCheck}
          hint={`${activeEmployees.length ? Math.round((permanentCount / activeEmployees.length) * 100) : 0}% of workforce`}
        />
        <StatTile
          label="Freelance"
          value={freelanceCount}
          icon={Briefcase}
          hint={`${activeEmployees.length ? Math.round((freelanceCount / activeEmployees.length) * 100) : 0}% of workforce`}
          accentClassName="bg-violet-500/15 text-violet-600 dark:text-violet-300"
        />
        <StatTile
          label="Qatari Nationals"
          value={qatariCount}
          icon={Globe2}
          hint={`${activeEmployees.length ? Math.round((qatariCount / activeEmployees.length) * 100) : 0}% of workforce`}
          accentClassName="bg-success/15 text-success"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <DepartmentHeadcountChart employees={activeEmployees} />
        </div>
        <NationalityPieChart employees={activeEmployees} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <AgeDistributionChart employees={activeEmployees} />
        </div>
        <LeaveSummaryCard employees={employees} />
      </div>

      <FreelanceSpendChart />
    </div>
  );
}
