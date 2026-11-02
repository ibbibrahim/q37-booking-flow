import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { HrDepartment, HrDepartmentUnitType } from '../types/hrApi';

interface Props {
  department: HrDepartment | null;
  saving: boolean;
  onClose: () => void;
  onSave: (nameEn: string, nameAr: string, unitType: HrDepartmentUnitType) => void;
}

/** Small popup for editing a department: both names together (every place that
 * displays a department reads whichever language is active) and whether it
 * reports directly to the General Manager in the org chart. */
export function EditDepartmentModal({ department, saving, onClose, onSave }: Props) {
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [reportsToGm, setReportsToGm] = useState(false);

  useEffect(() => {
    if (department) {
      setNameEn(department.nameEn);
      setNameAr(department.nameAr);
      setReportsToGm(department.unitType === 'GmOffice');
    }
  }, [department]);

  const canSave = nameEn.trim().length > 0 && nameAr.trim().length > 0;

  return (
    <Dialog open={!!department} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Department</DialogTitle>
          <DialogDescription>Update the department's names and where it appears in the org chart.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="dept-name-en">English name</Label>
            <Input
              id="dept-name-en"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              disabled={saving}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dept-name-ar">Arabic name</Label>
            <Input
              id="dept-name-ar"
              dir="rtl"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="dept-reports-to-gm">Reports directly to General Manager</Label>
              <p className="text-xs text-muted-foreground">
                Shown beside the General Manager in the org chart instead of in the department row.
              </p>
            </div>
            <Switch
              id="dept-reports-to-gm"
              checked={reportsToGm}
              onCheckedChange={setReportsToGm}
              disabled={saving}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => onSave(nameEn.trim(), nameAr.trim(), reportsToGm ? 'GmOffice' : 'Department')} disabled={!canSave || saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
