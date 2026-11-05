import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { AlertCircle, ArrowLeft, ChevronDown, ChevronUp, Info, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { bitChecklistApi, getApiErrorMessage } from '@/api/bitChecklistApi';
import { useToast } from '@/contexts/ToastContext';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { ChecklistTemplateFormDialog } from '../components/ChecklistTemplateFormDialog';
import { VendorBadge } from '../components/VendorBadge';
import { checklistTypeLabel, isChecklistType, sectionNamesFrom } from '../utils/checklistUtils';
import type { ChecklistTemplate, ChecklistType, SaveChecklistTemplate } from '../types/checklist';

export function BITChecklistManagePage() {
  const { type } = useParams<{ type: string }>();

  if (!isChecklistType(type)) {
    return <Navigate to="/bit" replace />;
  }

  return <ChecklistManage key={type} type={type} />;
}

function ChecklistManage({ type }: { type: ChecklistType }) {
  usePageHeader(`Manage ${checklistTypeLabel(type)} Checklist`, 'Add, edit, reorder or remove checklist items');

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const queryKey = ['bit-checklist-templates', type];

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ChecklistTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<ChecklistTemplate | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const {
    data: templates = [],
    isLoading,
    error,
    refetch,
  } = useQuery({ queryKey, queryFn: () => bitChecklistApi.getTemplates(type) });

  const sections = useMemo(() => sectionNamesFrom(templates), [templates]);
  const errorMessage = error ? getApiErrorMessage(error, 'Failed to load checklist items. Please try again.') : null;

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  async function handleSubmit(body: SaveChecklistTemplate) {
    setSaving(true);
    try {
      if (editing) {
        await bitChecklistApi.updateTemplate(editing.id, body);
      } else {
        await bitChecklistApi.createTemplate(body);
      }
      await queryClient.invalidateQueries({ queryKey });
      showToast(editing ? 'Item updated' : 'Item added', 'success');
      setFormOpen(false);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Could not save item'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await bitChecklistApi.deleteTemplate(deleting.id);
      await queryClient.invalidateQueries({ queryKey });
      showToast('Item removed', 'success');
      setDeleting(null);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Could not remove item'), 'error');
    } finally {
      setDeletingBusy(false);
    }
  }

  async function move(id: number, delta: -1 | 1) {
    const index = templates.findIndex((t) => t.id === id);
    if (index < 0) return;
    let target = index + delta;
    while (target >= 0 && target < templates.length && templates[target].sectionName !== templates[index].sectionName) {
      target += delta;
    }
    if (target < 0 || target >= templates.length) return;
    const next = [...templates];
    [next[index], next[target]] = [next[target], next[index]];
    queryClient.setQueryData<ChecklistTemplate[]>(queryKey, next);
    try {
      await bitChecklistApi.reorderTemplates(type, next.map((t) => t.id));
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Could not reorder items'), 'error');
    } finally {
      queryClient.invalidateQueries({ queryKey });
    }
  }

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-3"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/bit/checklist/${type}`)}>
            <ArrowLeft />
            Back
          </Button>
          {!isLoading && !errorMessage && (
            <span className="text-sm text-muted-foreground tabular-nums">
              {templates.length} {templates.length === 1 ? 'item' : 'items'} · {sections.length}{' '}
              {sections.length === 1 ? 'section' : 'sections'}
            </span>
          )}
          <Button className="ml-auto" onClick={openCreate}>
            <Plus />
            Add item
          </Button>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-info/30 bg-info/10 px-3 py-2 text-xs text-info">
          <Info size={14} className="shrink-0" />
          Added or removed items only affect the current and future checklists. Edited wording also shows on past checklists.
        </div>
      </motion.div>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-3 p-5">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && errorMessage && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <AlertCircle size={28} className="text-destructive" />
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !errorMessage && templates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ListChecks size={24} />
            </div>
            <p className="font-semibold text-card-foreground">No items in this checklist yet</p>
            <Button onClick={openCreate}>
              <Plus />
              Add item
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !errorMessage && templates.length > 0 && (
        <div className="space-y-4">
          {sections.map((section, sIndex) => {
            const items = templates.filter((t) => t.sectionName === section);
            return (
              <motion.div
                key={section}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(0.06 * sIndex, 0.3) }}
              >
                <Card>
                  <div className="flex items-center gap-2 border-b border-border px-5 py-3">
                    <h2 className="font-semibold text-card-foreground">{section}</h2>
                    <Badge variant="secondary">{items.length}</Badge>
                  </div>
                  <div className="divide-y divide-border">
                    {items.map((t, rIndex) => {
                      const globalIndex = templates.findIndex((x) => x.id === t.id);
                      return (
                        <motion.div
                          key={t.id}
                          layout="position"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: Math.min(0.03 * rIndex, 0.3) }}
                          className="flex items-center gap-3 px-5 py-3"
                        >
                          <span className="w-6 shrink-0 text-sm tabular-nums text-muted-foreground">
                            {globalIndex + 1}
                          </span>
                          <VendorBadge vendor={t.vendor} className="shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-card-foreground">{t.applicationName}</p>
                            <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                              {t.ip && <span className="font-mono">{t.ip}</span>}
                              <span>
                                {t.actionSteps.length} {t.actionSteps.length === 1 ? 'step' : 'steps'}
                              </span>
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              aria-label="Move up"
                              disabled={rIndex === 0}
                              onClick={() => move(t.id, -1)}
                            >
                              <ChevronUp />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              aria-label="Move down"
                              disabled={rIndex === items.length - 1}
                              onClick={() => move(t.id, 1)}
                            >
                              <ChevronDown />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              aria-label="Edit item"
                              onClick={() => {
                                setEditing(t);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              aria-label="Remove item"
                              onClick={() => setDeleting(t)}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <ChecklistTemplateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        type={type}
        template={editing}
        sections={sections}
        onSubmit={handleSubmit}
        submitting={saving}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && !deletingBusy && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove “{deleting?.applicationName}”?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be removed from current and future {type} checklists. Past submissions keep their record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingBusy}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
