import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ShiftOptionChip } from './ShiftOptionChip';
import { DraggableProgramChip } from './DraggableProgramChip';
import { PREDEFINED_PROGRAMS } from '../utils/rotaConstants';
import { formatShiftTiming } from '../utils/rotaUtils';
import type { RotaDepartment } from '../types/rota';
import { Plus } from 'lucide-react';

export interface ShiftOptionsPoolProps {
  onCustomClick?: () => void;
  department?: RotaDepartment | null;
}

export function ShiftOptionsPool({
  onCustomClick,
  department,
}: ShiftOptionsPoolProps) {
  return (
    <Card className="w-64 h-full overflow-hidden flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Shift Options</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Drag to assign to employee cells
        </p>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-4 pt-0">
        {/* Shift Types Section */}
        <div>
          <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
            SHIFT TYPES
          </Label>
          <div className="flex flex-wrap gap-2">
            <ShiftOptionChip
              optionType="morning"
              timing={formatShiftTiming(
                department?.morningStartTime,
                department?.morningEndTime
              )}
            />
            <ShiftOptionChip
              optionType="evening"
              timing={formatShiftTiming(
                department?.eveningStartTime,
                department?.eveningEndTime
              )}
            />
            <ShiftOptionChip
              optionType="night"
              timing={formatShiftTiming(
                department?.nightStartTime,
                department?.nightEndTime
              )}
            />
            <ShiftOptionChip optionType="off" />
            <Button
              variant="outline"
              size="sm"
              onClick={onCustomClick}
              className="gap-1 h-8"
            >
              <Plus size={14} />
              Custom...
            </Button>
          </div>
        </div>

        {/* Program Names Section */}
        <div>
          <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
            PROGRAM NAMES
          </Label>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {PREDEFINED_PROGRAMS.map((program) => (
              <DraggableProgramChip key={program} programName={program} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
