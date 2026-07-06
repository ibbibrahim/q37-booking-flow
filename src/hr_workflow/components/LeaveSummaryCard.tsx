import { useNavigate } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { departments } from '../data/departments';
import type { Employee } from '../types/hr';

interface Props {
  employees: Employee[];
}

export function LeaveSummaryCard({ employees }: Props) {
  const navigate = useNavigate();
  const onLeave = employees.filter((e) => e.contractType === 'Freelance' && e.onLeave);

  const byDept = departments
    .map((dept) => ({
      department: dept.name,
      count: onLeave.filter((e) => e.departmentId === dept.id).length,
    }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Freelancers on Leave</CardTitle>
        <CardDescription>Permanent staff leave is tracked separately in Muwarid</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-11 w-11 rounded-lg bg-warning/15 text-warning flex items-center justify-center">
            <CalendarClock size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-card-foreground tabular-nums">{onLeave.length}</p>
            <p className="text-xs text-muted-foreground">freelancers currently on leave</p>
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
          <p className="text-sm text-muted-foreground">No freelancers currently on leave.</p>
        )}

        <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => navigate('/hr/leave-requests')}>
          View Leave Requests
        </Button>
      </CardContent>
    </Card>
  );
}
