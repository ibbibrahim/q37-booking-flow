import { AlertTriangle } from 'lucide-react';
import { Bar, BarChart, Cell, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useHRChartColors } from '../../utils/chartColors';
import { calcAge } from '../../utils/hrUtils';
import { departmentName } from '../../data/departments';
import type { Employee } from '../../types/hr';

interface Props {
  employees: Employee[];
}

const BUCKETS = [
  { key: '<25', min: 0, max: 24 },
  { key: '25-34', min: 25, max: 34 },
  { key: '35-44', min: 35, max: 44 },
  { key: '45-54', min: 45, max: 54 },
  { key: '55-59', min: 55, max: 59 },
  { key: '60+', min: 60, max: 200 },
];

export function AgeDistributionChart({ employees }: Props) {
  const colors = useHRChartColors();

  const withAge = employees.map((e) => ({ ...e, age: calcAge(e.dob) }));

  const data = BUCKETS.map((bucket) => {
    const inBucket = withAge.filter((e) => e.age >= bucket.min && e.age <= bucket.max);
    return {
      bucket: bucket.key,
      Permanent: inBucket.filter((e) => e.contractType === 'Permanent').length,
      Freelance: inBucket.filter((e) => e.contractType === 'Freelance').length,
      isSenior: bucket.key === '60+',
    };
  });

  const seniorFreelancers = withAge.filter((e) => e.contractType === 'Freelance' && e.age >= 60);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Age Distribution</CardTitle>
        <CardDescription>Calculated from date of birth · freelancers aged 60+ flagged for review</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis dataKey="bucket" tick={{ fontSize: 12, fill: colors.muted }} stroke={colors.axis} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: colors.muted }} stroke={colors.axis} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'rgba(128,128,128,0.08)' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Permanent" stackId="age" fill={colors.permanent}>
                {data.map((d) => (
                  <Cell key={d.bucket} fill={colors.permanent} />
                ))}
              </Bar>
              <Bar dataKey="Freelance" stackId="age" radius={[4, 4, 0, 0]}>
                {data.map((d) => (
                  <Cell key={d.bucket} fill={d.isSenior ? colors.critical : colors.freelance} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {seniorFreelancers.length > 0 && (
          <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <div className="flex items-center gap-2 text-destructive text-sm font-semibold">
              <AlertTriangle size={16} />
              {seniorFreelancers.length} freelancer{seniorFreelancers.length > 1 ? 's' : ''} at or above age 60
            </div>
            <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
              {seniorFreelancers.map((e) => (
                <li key={e.id}>
                  {e.fullName} — {departmentName(e.departmentId)} (age {e.age})
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
