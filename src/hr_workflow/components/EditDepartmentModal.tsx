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
import type { HrDepartment } from '../types/hrApi';

interface Props {
  department: HrDepartment | null;
  saving: boolean;
  onClose: () => void;
  onSave: (nameEn: string, nameAr: string) => void;
}

/** Small popup for renaming a department in both languages at once — the
 * two names are edited together since every place that displays a
 * department (charts, lists, filters) reads whichever language is active. */
export function EditDepartmentModal({ department, saving, onClose, onSave }: Props) {
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');

  useEffect(() => {
    if (department) {
      setNameEn(department.nameEn);
      setNameAr(department.nameAr);
    }
  }, [department]);

  const canSave = nameEn.trim().length > 0 && nameAr.trim().length > 0;

  return (
    <Dialog open={!!department} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Department Name</DialogTitle>
          <DialogDescription>Update the English and Arabic name for this department.</DialogDescription>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => onSave(nameEn.trim(), nameAr.trim())} disabled={!canSave || saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
