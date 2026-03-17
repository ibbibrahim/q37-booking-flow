import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmployeeChip } from './EmployeeChip';
import { getEmployeeShiftCount } from '../utils/rotaUtils';
import type { RotaEmployee, RotaAssignment } from '../types/rota';

export interface EmployeePoolProps {
  employees: RotaEmployee[];
  assignments: RotaAssignment[];
  weekDates: Date[];
  selectedDate: Date | null;
}

export function EmployeePool({
  employees,
  assignments,
  weekDates,
}: EmployeePoolProps) {
  const [search, setSearch] = useState('');

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase().trim();
    return employees.filter((e) =>
      e.name.toLowerCase().includes(q)
    );
  }, [employees, search]);

  const getShiftCount = useCallback(
    (employeeId: number) => getEmployeeShiftCount(employeeId, assignments),
    [assignments]
  );

  return (
    <Card className="w-64 h-full overflow-hidden flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Employee Pool</CardTitle>
        <Input
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-2"
          aria-label="Search employees"
        />
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-2 pt-0">
        {filteredEmployees.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {employees.length === 0
              ? 'No employees in this department'
              : 'No employees match your search'}
          </p>
        ) : (
          filteredEmployees.map((employee) => {
            const shiftCount = getShiftCount(employee.id);
            return (
              <div
                key={employee.id}
                className="flex items-center justify-between gap-2 py-1">
                <EmployeeChip
                  employee={employee}
                  showRemove={false}
                  draggable
                />
                <Badge variant="secondary" className="text-xs shrink-0">
                  {shiftCount} shifts
                </Badge>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
