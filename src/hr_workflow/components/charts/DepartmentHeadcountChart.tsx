import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useHRChartColors } from '../../utils/chartColors';
import { useHrLanguage, bilingual } from '../../context/HrLanguageContext';
import type { HrDepartment, HrEmployee } from '../../types/hrApi';

interface Props {
  employees: HrEmployee[];
  departments: HrDepartment[];
}

export function DepartmentHeadcountChart({ employees, departments }: Props) {
  const colors = useHRChartColors();
  const { language, t } = useHrLanguage();

  const data = departments.map((dept) => {
    const deptEmployees = employees.filter((e) => e.departmentId === dept.id);
    const permanent = deptEmployees.filter((e) => e.contractType === 'Permanent').length;
    const freelance = deptEmployees.filter((e) => e.contractType === 'Freelance').length;
    return {
      department: bilingual(language, dept.nameEn, dept.nameAr),
      Permanent: permanent,
      Freelance: freelance,
      total: permanent + freelance,
    };
  });

  const totalLabel = (v: string | number | boolean | null | undefined) =>
    typeof v === 'number' && v > 0 ? String(v) : '';

  // Segments too thin to fit a legible number just get skipped rather than
  // overflowing into neighboring bars.
  const MIN_SEGMENT_FOR_LABEL = 4;
  const segmentLabel = (v: string | number | boolean | null | undefined) =>
    typeof v === 'number' && v >= MIN_SEGMENT_FOR_LABEL ? String(v) : '';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('headcountByDepartment')}</CardTitle>
        <CardDescription>{t('headcountByDepartmentDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-96" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 28, right: 8, left: 0, bottom: 64 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis
                dataKey="department"
                tick={{ fontSize: 11, fill: colors.muted }}
                angle={-35}
                textAnchor="end"
                interval={0}
                height={90}
                stroke={colors.axis}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: colors.muted }} stroke={colors.axis} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'rgba(128,128,128,0.08)' }} />
              <Legend verticalAlign="top" align="right" height={28} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Permanent" stackId="hc" fill={colors.permanent} radius={[0, 0, 0, 0]}>
                <LabelList dataKey="Permanent" position="center" formatter={segmentLabel} fill="#fff" fontSize={10} fontWeight={600} />
              </Bar>
              <Bar dataKey="Freelance" stackId="hc" fill={colors.freelance} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="Freelance" position="center" formatter={segmentLabel} fill="#fff" fontSize={10} fontWeight={600} />
                <LabelList dataKey="total" position="top" formatter={totalLabel} fill={colors.muted} fontSize={12} fontWeight={700} offset={8} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
