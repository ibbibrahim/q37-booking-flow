import React from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import type { DepartmentAcknowledgement } from '../types/callsheet';

interface AcknowledgementPanelProps {
  acknowledgements: DepartmentAcknowledgement[];
  onChange: (index: number, field: keyof DepartmentAcknowledgement, value: boolean | string) => void;
}

export const AcknowledgementPanel: React.FC<AcknowledgementPanelProps> = ({
  acknowledgements,
  onChange
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-card-foreground mb-4">
        Department Acknowledgements
      </h3>

      {acknowledgements.map((ack, index) => (
        <Card key={ack.department}>
          <CardContent className="pt-6">
            <h4 className="font-medium text-card-foreground mb-4">{ack.department}</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`acknowledge-${index}`}
                  checked={ack.acknowledged}
                  onCheckedChange={(checked) => onChange(index, 'acknowledged', checked as boolean)}
                />
                <Label
                  htmlFor={`acknowledge-${index}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  Acknowledge
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`approve-${index}`}
                  checked={ack.approved}
                  onCheckedChange={(checked) => onChange(index, 'approved', checked as boolean)}
                />
                <Label
                  htmlFor={`approve-${index}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  Approve
                </Label>
              </div>
            </div>

            <Textarea
              value={ack.comment}
              onChange={(e) => onChange(index, 'comment', e.target.value)}
              placeholder="Add comment (optional)"
              rows={2}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
