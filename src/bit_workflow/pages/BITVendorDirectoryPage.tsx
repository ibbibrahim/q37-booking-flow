import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { AlertCircle, Building2, Plus, Search } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { bitVendorApi } from '@/api/bitVendorApi';
import { getApiErrorMessage } from '@/api/bitChecklistApi';
import { useToast } from '@/contexts/ToastContext';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { VendorTable } from '../components/VendorTable';
import { VendorFormDialog } from '../components/VendorFormDialog';
import type { BitVendor, SaveBitVendor } from '../types/vendor';

const QUERY_KEY = ['bit-vendors'];

function matchesQuery(v: BitVendor, q: string): boolean {
  const haystack = [
    v.name,
    v.username,
    v.supportEmail,
    v.portalUrl,
    ...v.contacts.flatMap((c) => [c.name, c.phone]),
  ];
  return haystack.some((h) => h?.toLowerCase().includes(q));
}

function VendorTableSkeleton() {
  const head = 'h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <Table className="min-w-[1080px] [&_th]:border-r [&_td]:border-r [&_th]:border-border/70 [&_td]:border-border/70 [&_th:last-child]:border-r-0 [&_td:last-child]:border-r-0">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className={`${head} w-12 text-center`}>#</TableHead>
              <TableHead className={`${head} w-[220px]`}>Vendor</TableHead>
              <TableHead className={`${head} w-[230px]`}>Portal</TableHead>
              <TableHead className={`${head} w-[210px]`}>Username</TableHead>
              <TableHead className={`${head} w-[170px]`}>Password</TableHead>
              <TableHead className={head}>Support</TableHead>
              <TableHead className={`${head} w-12`}>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i} className="hover:bg-transparent">
                <TableCell className="py-3.5">
                  <Skeleton className="mx-auto h-3 w-4" />
                </TableCell>
                <TableCell className="py-3.5">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </TableCell>
                <TableCell className="py-3.5">
                  <Skeleton className="h-4 w-36" />
                </TableCell>
                <TableCell className="py-3.5">
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell className="py-3.5">
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell className="py-3.5">
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                <TableCell className="py-3.5">
                  <Skeleton className="h-6 w-6 rounded-md" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function BITVendorDirectoryPage() {
  usePageHeader('Vendor Directory', 'Support portals, logins and contacts for broadcast vendors');

  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BitVendor | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<BitVendor | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const {
    data: vendors = [],
    isLoading,
    error,
    refetch,
  } = useQuery({ queryKey: QUERY_KEY, queryFn: bitVendorApi.list });

  const query = search.trim().toLowerCase();
  const visible = useMemo(
    () => (query ? vendors.filter((v) => matchesQuery(v, query)) : vendors),
    [vendors, query]
  );

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(vendor: BitVendor) {
    setEditing(vendor);
    setFormOpen(true);
  }

  async function handleSubmit(body: SaveBitVendor) {
    setSaving(true);
    try {
      if (editing) {
        await bitVendorApi.update(editing.id, body);
      } else {
        await bitVendorApi.create(body);
      }
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      showToast(editing ? 'Vendor updated' : 'Vendor added', 'success');
      setFormOpen(false);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Could not save vendor'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await bitVendorApi.remove(deleting.id);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      showToast('Vendor deleted', 'success');
      setDeleting(null);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Could not delete vendor'), 'error');
    } finally {
      setDeletingBusy(false);
    }
  }

  async function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= vendors.length) return;
    const next = [...vendors];
    [next[index], next[target]] = [next[target], next[index]];
    queryClient.setQueryData<BitVendor[]>(QUERY_KEY, next);
    try {
      await bitVendorApi.reorder(next.map((v) => v.id));
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Could not reorder vendors'), 'error');
    } finally {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    }
  }

  const errorMessage = error ? getApiErrorMessage(error, 'Failed to load vendors. Please try again.') : null;
  const searching = query.length > 0;

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-3"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:max-w-sm">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendors, logins, contacts…"
              aria-label="Search vendors"
              className="pl-9"
            />
          </div>
          <span className="text-sm text-muted-foreground tabular-nums">
            {vendors.length} {vendors.length === 1 ? 'vendor' : 'vendors'}
          </span>
          <Button className="ml-auto" onClick={openCreate}>
            <Plus />
            Add vendor
          </Button>
        </div>
      </motion.div>

      {isLoading && <VendorTableSkeleton />}

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

      {!isLoading && !errorMessage && vendors.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 size={24} />
            </div>
            <div>
              <p className="font-semibold text-card-foreground">No vendors yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your first vendor to keep support portals and logins in one place.
              </p>
            </div>
            <Button onClick={openCreate}>
              <Plus />
              Add vendor
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !errorMessage && vendors.length > 0 && visible.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">No vendors match “{search.trim()}”</p>
      )}

      {!isLoading && !errorMessage && visible.length > 0 && (
        <VendorTable
          vendors={visible}
          allVendors={vendors}
          onEdit={openEdit}
          onDelete={setDeleting}
          canMove={!searching}
          onMove={move}
        />
      )}

      <VendorFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        vendor={editing}
        onSubmit={handleSubmit}
        submitting={saving}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && !deletingBusy && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the vendor and its saved credentials from the directory.
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
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
