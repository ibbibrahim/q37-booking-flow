import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/contexts/ToastContext';
import { deleteDtlProgram, listDtlPrograms } from '../services/dtlApi';
import { useDtlPermissions } from '../hooks/useDtlRole';
import type { DtlProgram } from '../types/dtl';
import { CreateDtlProgramModal } from './CreateDtlProgramModal';
import { EditDtlProgramModal } from './EditDtlProgramModal';
import { cn } from '@/lib/utils';
import { DTL_DIALOG_CONTENT_CLASS } from './dtlDialogStyles';

export function ManageDtlProgramsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const perms = useDtlPermissions();
  const { showToast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [editingProgram, setEditingProgram] = useState<DtlProgram | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dtl-programs'],
    queryFn: listDtlPrograms,
    enabled: open,
  });

  const items = data ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['dtl-programs'] });
  }

  async function handleDelete(program: DtlProgram) {
    if (!window.confirm(`Delete the program "${program.name}"?`)) return;
    setDeletingId(program.id);
    try {
      await deleteDtlProgram(program.id);
      invalidate();
      showToast('Program deleted', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Could not delete this program.', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className={cn(DTL_DIALOG_CONTENT_CLASS, 'sm:max-w-[640px]')} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <DialogTitle>DTL programs</DialogTitle>
              {perms.canManagePrograms && (
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium whitespace-nowrap"
                >
                  <Plus size={16} />
                  Create program
                </button>
              )}
            </div>
          </DialogHeader>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Price</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Duration (min)</th>
                    {perms.canManagePrograms && (
                      <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap" />
                    )}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={perms.canManagePrograms ? 4 : 3} className="py-12 text-center">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
                      </td>
                    </tr>
                  ) : isError ? (
                    <tr>
                      <td colSpan={perms.canManagePrograms ? 4 : 3} className="py-12 text-center text-destructive">
                        Could not load programs.
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={perms.canManagePrograms ? 4 : 3} className="py-12 text-center text-muted-foreground">
                        No programs yet.
                      </td>
                    </tr>
                  ) : (
                    items.map((p) => (
                      <tr key={p.id} className="border-b border-border transition-colors">
                        <td className="py-3 px-4 text-sm font-medium text-card-foreground">{p.name}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{p.price.toFixed(2)}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{p.durationMinutes ?? '—'}</td>
                        {perms.canManagePrograms && (
                          <td className="py-3 px-4 text-sm">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setEditingProgram(p)}
                                className="text-sm font-medium text-primary hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(p)}
                                disabled={deletingId === p.id}
                                className="text-sm font-medium text-destructive hover:underline disabled:opacity-50"
                              >
                                {deletingId === p.id ? 'Deleting…' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CreateDtlProgramModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => invalidate()}
      />

      <EditDtlProgramModal
        program={editingProgram}
        onClose={() => setEditingProgram(null)}
        onUpdated={() => invalidate()}
      />
    </>
  );
}
