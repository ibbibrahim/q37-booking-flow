import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useHRChartColors } from '../../utils/chartColors';
import { departments } from '../../data/departments';
import type { Employee } from '../../types/hr';

interface Props {
  employees: Employee[];
}

export function DepartmentHeadcountChart({ employees }: Props) {
  const colors = useHRChartColors();

  const data = departments.map((dept) => {
    const deptEmployees = employees.filter((e) => e.departmentId === dept.id);
    return {
      department: dept.name,
      Permanent: deptEmployees.filter((e) => e.contractType === 'Permanent').length,
      Freelance: deptEmployees.filter((e) => e.contractType === 'Freelance').length,
    };
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Headcount by Department</CardTitle>
        <CardDescription>Permanent vs Freelance employees per department</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis
                dataKey="department"
                tick={{ fontSize: 11, fill: colors.muted }}
                angle={-35}
                textAnchor="end"
                interval={0}
                height={70}
                stroke={colors.axis}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: colors.muted }} stroke={colors.axis} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'rgba(128,128,128,0.08)' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Permanent" stackId="hc" fill={colors.permanent} radius={[0, 0, 0, 0]} />
              <Bar dataKey="Freelance" stackId="hc" fill={colors.freelance} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
