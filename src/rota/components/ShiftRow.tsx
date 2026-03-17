import React, { memo } from 'react';
import { Sun, Sunset, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ShiftCell } from './ShiftCell';
import { getAssignmentsForCell } from '../utils/rotaUtils';
import { isFriday } from '../utils/dateUtils';
import type { RotaDepartment, RotaAssignment, RotaEmployee } from '../types/rota';

export interface ShiftRowProps {
  shiftType: 'morning' | 'evening' | 'night';
  weekDates: Date[];
  assignments: RotaAssignment[];
  department: RotaDepartment;
  employees: RotaEmployee[];
  onDrop: (employeeId: number, date: Date, shiftType: string) => void;
  onRemove: (assignmentId: number) => void;
}

const shiftIcons = {
  morning: Sun,
  evening: Sunset,
  night: Moon,
};

const shiftColors = {
  morning: 'text-orange-500',
  evening: 'text-blue-500',
  night: 'text-indigo-500',
};

export const ShiftRow = memo(function ShiftRow({
  shiftType,
  weekDates,
  assignments,
  department,
  employees,
  onDrop,
  onRemove,
}: ShiftRowProps) {
  const Icon = shiftIcons[shiftType];
  const requiredCount =
    department[`${shiftType}Required` as keyof RotaDepartment] as number;

  return (
    <tr>
      <td className="px-4 py-2 border-r bg-muted/20">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', shiftColors[shiftType])} />
          <span className="uppercase text-xs font-medium">{shiftType}</span>
        </div>
      </td>

      {weekDates.map((date) => (
        <ShiftCell
          key={date.toISOString()}
          date={date}
          shiftType={shiftType}
          assignments={getAssignmentsForCell(assignments, date, shiftType)}
          employees={employees}
          requiredCount={requiredCount}
          disabled={isFriday(date)}
          onDrop={(employeeId) => onDrop(employeeId, date, shiftType)}
          onRemove={onRemove}
        />
      ))}
    </tr>
  );
});
