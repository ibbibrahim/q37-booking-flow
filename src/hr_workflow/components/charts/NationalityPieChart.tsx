import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useHRChartColors } from '../../utils/chartColors';
import type { Employee } from '../../types/hr';

interface Props {
  employees: Employee[];
}

export function NationalityPieChart({ employees }: Props) {
  const colors = useHRChartColors();
  const qatariCount = employees.filter((e) => e.isQatari).length;
  const nonQatariCount = employees.length - qatariCount;

  const data = [
    { name: 'Qatari', value: qatariCount, color: colors.qatari },
    { name: 'Non-Qatari', value: nonQatariCount, color: colors.nonQatari },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Qatari vs Non-Qatari</CardTitle>
        <CardDescription>Nationalization split across all active employees</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                label={({ name, value, percent }) =>
                  `${name}: ${value} (${((percent ?? 0) * 100).toFixed(0)}%)`
                }
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`${value} employees`, name]}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <Legend verticalAlign="bottom" height={32} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
