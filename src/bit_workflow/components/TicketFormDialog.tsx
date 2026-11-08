import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Radio } from 'lucide-react';
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
import { MultiFileUploadField, type UploadedFileRef } from '@/components/ui/multi-file-upload-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { bitTicketApi } from '@/api/bitTicketApi';
import { bitVendorApi } from '@/api/bitVendorApi';
import { getApiErrorMessage } from '@/api/bitChecklistApi';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/lib/utils';
import { TONE_PILL } from '@/lib/tone';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
  PRIORITY_TONES,
  fromLocalInput,
  slaHint,
  toLocalInput,
} from '../utils/ticketUtils';
import type {
  BitTicketDetail,
  BitTicketListItem,
  TicketCategory,
  TicketPriority,
} from '../types/ticket';

interface TicketFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create; a ticket = edit (assignee and attachments are hidden). */
  ticket: BitTicketDetail | BitTicketListItem | null;
  /** Description isn't on list items — pass it when editing from detail. */
  description?: string;
  onSaved?: (ticket: BitTicketDetail) => void;
}

const NO_VENDOR = '__none__';
const UNASSIGNED = '__unassigned__';
const ME = '__me__';

interface FormErrors {
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

export function TicketFormDialog({ open, onOpenChange, ticket, description: ticketDescription, onSaved }: TicketFormDialogProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = ticket !== null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory | ''>('');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [affectedSystem, setAffectedSystem] = useState('');
  const [vendorId, setVendorId] = useState<string>(NO_VENDOR);
  const [vendorCaseRef, setVendorCaseRef] = useState('');
  const [assignee, setAssignee] = useState<string>(UNASSIGNED);
  const [attachments, setAttachments] = useState<UploadedFileRef[]>([]);
  const [onAir, setOnAir] = useState(false);
  const [incidentStart, setIncidentStart] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const { data: vendors = [] } = useQuery({ queryKey: ['bit-vendors'], queryFn: bitVendorApi.list, enabled: open });
  const { data: assignees = [] } = useQuery({
    queryKey: ['bit-ticket-assignees'],
    queryFn: bitTicketApi.assignees,
    enabled: open && !isEdit,
  });

  useEffect(() => {
    if (!open) return;
    setTitle(ticket?.title ?? '');
    setDescription(ticketDescription ?? '');
    setCategory(ticket?.category ?? '');
    setPriority(ticket?.priority ?? 'medium');
    setAffectedSystem(ticket?.affectedSystem ?? '');
    setVendorId(ticket?.vendorId ? String(ticket.vendorId) : NO_VENDOR);
    setVendorCaseRef(ticket?.vendorCaseRef ?? '');
    setAssignee(UNASSIGNED);
    setAttachments([]);
    setOnAir(false);
    setIncidentStart(toLocalInput(new Date().toISOString()));
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens
  }, [open, ticket?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: FormErrors = {};
    if (!title.trim()) next.title = 'Title is required';
    else if (title.trim().length > 200) next.title = 'Title must be 200 characters or fewer';
    if (!description.trim()) next.description = 'Description is required';
    if (!category) next.category = 'Category is required';
    if (!priority) next.priority = 'Priority is required';
    setErrors(next);
    if (Object.keys(next).length > 0 || !category) return;

    const chosenVendor = vendorId === NO_VENDOR ? null : Number(vendorId);
    const common = {
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      affectedSystem: affectedSystem.trim() || null,
      vendorId: chosenVendor,
      vendorCaseRef: chosenVendor ? vendorCaseRef.trim() || null : null,
    };

    setSubmitting(true);
    try {
      let saved: BitTicketDetail;
      if (ticket) {
        saved = await bitTicketApi.update(ticket.id, common);
      } else {
        const assigneeUserId = assignee === UNASSIGNED ? null : assignee === ME ? (user?.id ?? null) : Number(assignee);
        saved = await bitTicketApi.create({
          ...common,
          assigneeUserId,
          attachments,
          ...(onAir ? { onAirImpact: true, incidentStartedAt: fromLocalInput(incidentStart) ?? new Date().toISOString() } : {}),
        });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bit-tickets'] }),
        queryClient.invalidateQueries({ queryKey: ['bit-ticket-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['bit-ticket', saved.id] }),
      ]);
      showToast(isEdit ? 'Ticket updated' : `Ticket ${saved.ticketNo} created`, 'success');
      onOpenChange(false);
      onSaved?.(saved);
    } catch (err) {
      showToast(getApiErrorMessage(err, isEdit ? 'Could not update ticket' : 'Could not create ticket'), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const otherAssignees = assignees.filter((a) => a.userId !== user?.id);

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${ticket.ticketNo}` : 'New ticket'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the ticket details.' : 'Describe the issue so a teammate can pick it up.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="ticket-title">Title *</Label>
            <Input
              id="ticket-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Short summary of the issue"
              aria-invalid={!!errors.title}
              autoFocus
            />
            <FieldError message={errors.title} />
          </div>

          {!isEdit && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <Radio size={18} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <Label htmlFor="ticket-on-air" className="text-sm font-semibold text-card-foreground">
                    On-air impact
                  </Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Affects or may affect the on-air broadcast. Management will be emailed immediately and an incident
                    report will be required.
                  </p>
                </div>
                <Switch
                  id="ticket-on-air"
                  checked={onAir}
                  onCheckedChange={(checked) => {
                    setOnAir(checked);
                    if (checked) {
                      setPriority('critical');
                      setIncidentStart(toLocalInput(new Date().toISOString()));
                    }
                  }}
                  className="data-[state=checked]:bg-destructive"
                />
              </div>
              {onAir && (
                <div className="mt-3 space-y-1.5 border-t border-destructive/20 pt-3 sm:max-w-xs">
                  <Label htmlFor="ticket-incident-start">Incident started at</Label>
                  <Input
                    id="ticket-incident-start"
                    type="datetime-local"
                    value={incidentStart}
                    max={toLocalInput(new Date().toISOString())}
                    onChange={(e) => setIncidentStart(e.target.value)}
                    className="tabular-nums"
                  />
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label id="ticket-priority-label">Priority *</Label>
            <div role="radiogroup" aria-labelledby="ticket-priority-label" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PRIORITIES.map((p) => {
                const selected = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setPriority(p)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selected
                        ? cn(TONE_PILL[PRIORITY_TONES[p]], 'ring-1 ring-current')
                        : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {PRIORITY_LABELS[p]}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{slaHint(priority)}</p>
            <FieldError message={errors.priority} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ticket-category">Category *</Label>
              <Select value={category || undefined} onValueChange={(v) => setCategory(v as TicketCategory)}>
                <SelectTrigger id="ticket-category" aria-invalid={!!errors.category}>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.category} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ticket-system">Affected system</Label>
              <Input
                id="ticket-system"
                value={affectedSystem}
                onChange={(e) => setAffectedSystem(e.target.value)}
                maxLength={150}
                placeholder="e.g. PCR1 Vizrt engine, EVS XT-VIA 3"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ticket-vendor">Vendor</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger id="ticket-vendor">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_VENDOR}>None</SelectItem>
                  {vendors.length > 0 && <SelectSeparator />}
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {vendorId !== NO_VENDOR && (
              <div className="space-y-1.5">
                <Label htmlFor="ticket-case">Vendor case #</Label>
                <Input
                  id="ticket-case"
                  value={vendorCaseRef}
                  onChange={(e) => setVendorCaseRef(e.target.value)}
                  maxLength={100}
                  className="font-mono"
                  placeholder="Vendor's reference number"
                />
              </div>
            )}
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="ticket-assignee">Assignee</Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger id="ticket-assignee">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned — let the team pick it up</SelectItem>
                  <SelectItem value={ME}>Me</SelectItem>
                  {otherAssignees.length > 0 && <SelectSeparator />}
                  {otherAssignees.map((a) => (
                    <SelectItem key={a.userId} value={String(a.userId)}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="ticket-description">Description *</Label>
            <Textarea
              id="ticket-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="What happened, what is affected, and anything already tried"
              aria-invalid={!!errors.description}
            />
            <FieldError message={errors.description} />
          </div>

          {!isEdit && (
            <MultiFileUploadField
              id="ticket-attachments"
              label="Attachments"
              value={attachments}
              onChange={setAttachments}
              onUpload={bitTicketApi.upload}
              accept="image/*,.pdf,.log,.txt"
            />
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {isEdit ? 'Save changes' : 'Create ticket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
