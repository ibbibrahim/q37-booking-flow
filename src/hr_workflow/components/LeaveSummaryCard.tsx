import { useNavigate } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useHrLanguage, bilingual } from '../context/HrLanguageContext';
import type { HrEmployee } from '../types/hrApi';

interface Props {
  employees: HrEmployee[];
}

export function LeaveSummaryCard({ employees }: Props) {
  const navigate = useNavigate();
  const { language, t } = useHrLanguage();
  const onLeave = employees.filter((e) => e.status === 'On Leave');

  const byDept = Object.values(
    onLeave.reduce<Record<number, { department: string; count: number }>>((acc, e) => {
      const key = e.departmentId;
      if (!acc[key]) {
        acc[key] = { department: bilingual(language, e.departmentNameEn, e.departmentNameAr), count: 0 };
      }
      acc[key].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('employeesOnLeave')}</CardTitle>
        <CardDescription>{t('employeesOnLeaveDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-11 w-11 rounded-lg bg-warning/15 text-warning flex items-center justify-center">
            <CalendarClock size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-card-foreground tabular-nums">{onLeave.length}</p>
            <p className="text-xs text-muted-foreground">{t('currentlyOnLeave')}</p>
          </div>
        </div>

        {byDept.length > 0 ? (
          <ul className="space-y-2">
            {byDept.map((d) => (
              <li key={d.department} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{d.department}</span>
                <span className="font-semibold text-card-foreground tabular-nums">{d.count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t('noOneOnLeave')}</p>
        )}

        <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => navigate('/hr/leave-requests')}>
          {t('viewLeaveRequests')}
        </Button>
      </CardContent>
    </Card>
  );
}
