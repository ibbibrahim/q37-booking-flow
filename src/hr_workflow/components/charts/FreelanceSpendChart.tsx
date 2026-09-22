import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useHRChartColors } from '../../utils/chartColors';
import { useHrLanguage, bilingual } from '../../context/HrLanguageContext';
import { formatCurrencyQAR } from '../../utils/hrUtils';
import type { HrDepartment, HrEmployee } from '../../types/hrApi';

interface Props {
  employees: HrEmployee[];
  departments: HrDepartment[];
}

export function FreelanceSpendChart({ employees, departments }: Props) {
  const colors = useHRChartColors();
  const { language, t } = useHrLanguage();

  const freelancers = employees.filter((e) => e.contractType === 'Freelance');

  const data = departments.map((dept) => ({
    department: bilingual(language, dept.nameEn, dept.nameAr),
    spend: freelancers
      .filter((e) => e.departmentId === dept.id)
      .reduce((sum, e) => sum + (e.monthlyRate ?? 0), 0),
  }));

  const total = data.reduce((sum, d) => sum + d.spend, 0);
  const knownCount = freelancers.filter((e) => e.monthlyRate).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('freelanceSpendByDepartment')}</CardTitle>
        <CardDescription>
          {t('freelanceSpendByDepartmentDesc')} — {t('total')} {formatCurrencyQAR(total)} ({knownCount}/{freelancers.length} {t('rateOnFile')})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 48 }}>
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
              <YAxis
                tick={{ fontSize: 12, fill: colors.muted }}
                stroke={colors.axis}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value) => [formatCurrencyQAR(Number(value)), 'Freelance spend']}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
                cursor={{ fill: 'rgba(128,128,128,0.08)' }}
              />
              <Bar dataKey="spend" fill={colors.sequential} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
