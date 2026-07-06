import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ShiftOptionChip } from './ShiftOptionChip';
import { DynamicShiftChip } from './DynamicShiftChip';
import { DraggableProgramChip } from './DraggableProgramChip';
import { PREDEFINED_PROGRAMS } from '../utils/rotaConstants';
import type { RotaDepartment, RotaShiftType } from '../types/rota';
import { Plus } from 'lucide-react';

export interface ShiftOptionsPoolProps {
  onCustomClick?: () => void;
  department?: RotaDepartment | null;
  /** Resolved shift types (department.shiftTypes or API query) */
  shiftTypes: RotaShiftType[];
  /** Hide predefined program name chips (e.g. departments that do not schedule by program). */
  hideProgramNames?: boolean;
}

export function ShiftOptionsPool({
  onCustomClick,
  department,
  shiftTypes,
  hideProgramNames = false,
}: ShiftOptionsPoolProps) {
  const activeSorted = [...shiftTypes]
    .filter((s) => s.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <Card className="w-64 h-full overflow-hidden flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Shift Options</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Drag to assign to employee cells
        </p>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-4 pt-0">
        <div>
          <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
            SHIFT TYPES
          </Label>
          <div className="flex flex-wrap gap-2">
            {activeSorted.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No shift types configured
                {department?.name ? ` for ${department.name}` : ''}. Add them in
                department settings.
              </p>
            )}
            {activeSorted.map((shift, index) => (
              <DynamicShiftChip key={shift.id} shift={shift} index={index} />
            ))}
            <ShiftOptionChip optionType="off" />
            {/* <Button
              variant="outline"
              size="sm"
              onClick={onCustomClick}
              className="gap-1 h-8"
            >
              <Plus size={14} />
              Custom...
            </Button> */}
          </div>
        </div>

        {!hideProgramNames && (
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
              PROGRAM NAMES
            </Label>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {PREDEFINED_PROGRAMS.map((program, index) => (
                <DraggableProgramChip key={program} programName={program} index={index} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
