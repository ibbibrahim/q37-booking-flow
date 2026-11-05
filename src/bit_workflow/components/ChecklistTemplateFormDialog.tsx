import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { checklistTypeLabel } from '../utils/checklistUtils';
import { VendorBadge } from './VendorBadge';
import type {
  ChecklistTemplate,
  ChecklistType,
  ChecklistVendor,
  SaveChecklistTemplate,
} from '../types/checklist';

interface ChecklistTemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ChecklistType;
  /** null = create */
  template: ChecklistTemplate | null;
  /** Existing section names, offered as suggestions. */
  sections: string[];
  onSubmit: (body: SaveChecklistTemplate) => void | Promise<void>;
  submitting: boolean;
}

const VENDOR_OPTIONS: { value: ChecklistVendor; label: string }[] = [
  { value: 'evs', label: 'EVS' },
  { value: 'vizrt', label: 'Vizrt' },
  { value: 'avid', label: 'Avid' },
  { value: 'wires', label: 'Wires' },
  { value: 'vantage', label: 'Telestream Vantage' },
  { value: 'glookast', label: 'Glookast' },
  { value: 'other', label: 'Other/System' },
];

/** Sentinel Select value for the "New section…" option — never saved. */
const NEW_SECTION = '__new_section__';

interface FormErrors {
  sectionName?: string;
  applicationName?: string;
  steps?: string;
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

export function ChecklistTemplateFormDialog({
  open,
  onOpenChange,
  type,
  template,
  sections,
  onSubmit,
  submitting,
}: ChecklistTemplateFormDialogProps) {
  const [sectionName, setSectionName] = useState('');
  /** Typing a brand-new section instead of picking one from the dropdown. */
  const [creatingSection, setCreatingSection] = useState(false);
  const [applicationName, setApplicationName] = useState('');
  const [ip, setIp] = useState('');
  const [vendor, setVendor] = useState<ChecklistVendor>('other');
  const [steps, setSteps] = useState<string[]>(['']);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!open) return;
    setSectionName(template?.sectionName ?? '');
    setCreatingSection(sections.length === 0);
    setApplicationName(template?.applicationName ?? '');
    setIp(template?.ip ?? '');
    setVendor(template?.vendor ?? 'other');
    setSteps(template && template.actionSteps.length > 0 ? [...template.actionSteps] : ['']);
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens
  }, [open, template]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanSteps = steps.map((s) => s.trim()).filter(Boolean);
    const next: FormErrors = {};
    if (!sectionName.trim()) next.sectionName = 'Section is required';
    if (!applicationName.trim()) next.applicationName = 'Application name is required';
    if (cleanSteps.length === 0) next.steps = 'Add at least one action step';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    await onSubmit({
      type,
      sectionName: sectionName.trim(),
      applicationName: applicationName.trim(),
      ip: ip.trim(),
      actionSteps: cleanSteps,
      vendor,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{template ? 'Edit checklist item' : 'Add checklist item'}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <span>{template ? 'Update this item for the' : 'Add a new item to the'}</span>
            <Badge variant="secondary">{checklistTypeLabel(type)}</Badge>
            <span>checklist.</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="template-section">Section *</Label>
              {creatingSection && sections.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCreatingSection(false);
                    setSectionName(template?.sectionName ?? '');
                  }}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Choose existing section
                </button>
              )}
            </div>
            {creatingSection ? (
              <Input
                id="template-section"
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                placeholder="New section name, e.g. Evening Shift"
                aria-invalid={!!errors.sectionName}
                autoFocus
              />
            ) : (
              <Select
                value={sections.includes(sectionName) ? sectionName : undefined}
                onValueChange={(value) => {
                  if (value === NEW_SECTION) {
                    setCreatingSection(true);
                    setSectionName('');
                  } else {
                    setSectionName(value);
                  }
                }}
              >
                <SelectTrigger id="template-section" aria-invalid={!!errors.sectionName}>
                  <SelectValue placeholder="Select a section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value={NEW_SECTION} className="text-primary">
                    <span className="inline-flex items-center gap-1.5">
                      <Plus size={14} />
                      New section…
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
            <FieldError message={errors.sectionName} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="template-app">Application name *</Label>
              <Input
                id="template-app"
                value={applicationName}
                onChange={(e) => setApplicationName(e.target.value)}
                aria-invalid={!!errors.applicationName}
              />
              <FieldError message={errors.applicationName} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="template-ip">IP / host</Label>
              <Input id="template-ip" value={ip} onChange={(e) => setIp(e.target.value)} className="font-mono" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="template-vendor">Vendor</Label>
            <div className="flex items-center gap-3">
              <Select value={vendor} onValueChange={(v) => setVendor(v as ChecklistVendor)}>
                <SelectTrigger id="template-vendor" className="sm:max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VENDOR_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <VendorBadge vendor={vendor} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Action steps *</Label>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{i + 1}.</span>
                  <Input
                    value={step}
                    onChange={(e) => setSteps((prev) => prev.map((s, idx) => (idx === i ? e.target.value : s)))}
                    placeholder="Describe the check to perform"
                    aria-label={`Step ${i + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove step ${i + 1}`}
                    onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
            <FieldError message={errors.steps} />
            <Button type="button" variant="outline" size="sm" onClick={() => setSteps((prev) => [...prev, ''])}>
              <Plus />
              Add step
            </Button>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
