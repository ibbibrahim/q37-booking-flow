import { DndContext } from '@dnd-kit/core';
import { DepartmentSection } from './DepartmentSection';
import { formatDateDisplay } from '../utils/dateUtils';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  RotaDepartment,
  RotaAssignment,
  RotaEmployee,
  RotaWeek,
  RotaShiftType,
  RotaAssignPayload,
} from '../types/rota';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface RotaCalendarProps {
  week: RotaWeek | undefined;
  department: RotaDepartment | null;
  employees: RotaEmployee[];
  weekDates: Date[];
  shiftTypes?: RotaShiftType[];
  isLoading: boolean;
  readOnly?: boolean;
  /** Sub-department header rows (e.g. Producing Team) can collapse their employee rows. */
  collapsibleSubTeams?: boolean;
  onAssign: (employeeId: number, date: Date, payload: RotaAssignPayload) => void;
  onRemove: (assignmentId: number) => void;
  onEdit: (assignment: RotaAssignment | null, employeeId: number, date: Date) => void;
}

export function RotaCalendar({
  week,
  department,
  employees,
  weekDates,
  shiftTypes = [],
  isLoading,
  readOnly = false,
  collapsibleSubTeams = true,
  onAssign,
  onRemove,
  onEdit,
}: RotaCalendarProps) {
  if (isLoading || !department) {
    return (
      <div className="overflow-x-auto rounded-lg border">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const tableContent = (
    <div className="overflow-x-auto rounded-lg border print:overflow-visible print:border">
      <table className="w-full border-collapse print:table-fixed">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-background border-b border-r px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
              Employee
            </th>
            {weekDates.map((date) => (
              <th
                key={date.toISOString()}
                className="border-b px-2 py-3 text-center text-xs font-semibold"
              >
                <div>{DAY_NAMES[date.getDay()]}</div>
                <div className="text-muted-foreground font-normal mt-0.5">
                  {formatDateDisplay(date)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {week && (
            <DepartmentSection
              department={department}
              weekDates={weekDates}
              assignments={week.assignments}
              employees={employees}
              shiftTypes={shiftTypes}
              readOnly={readOnly}
              collapsibleSubTeams={collapsibleSubTeams}
              onAssign={onAssign}
              onRemove={onRemove}
              onEdit={onEdit}
            />
          )}
        </tbody>
      </table>
    </div>
  );

  if (readOnly) {
    return (
      <DndContext onDragEnd={() => {}}>
        {tableContent}
      </DndContext>
    );
  }

  return tableContent;
}
