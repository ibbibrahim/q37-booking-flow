import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateDtlGuestModal } from './CreateDtlGuestModal';
import {
  appendDtlBookingLog,
  createDtlBooking,
  listDtlPrograms,
  searchDtlGuests,
  updateDtlBooking,
} from '../services/dtlApi';
import { useDtlRole } from '../hooks/useDtlRole';
import { nowInQatar, qatarInputToIso, QATAR_TIME_LABEL, toQatarInputValue, formatDtlBookingTime } from '../services/dtlTime';
import type { DtlBooking, DtlGuest } from '../types/dtl';

function describeChange(label: string, from: string, to: string): string {
  return `${label}: ${from || '(empty)'} → ${to || '(empty)'}`;
}

// Pass `booking` (and its `guest`) to open the modal in edit mode. Mount it conditionally so the
// form state initialises from the booking each time it opens.
export function CreateDtlBookingModal({
  open,
  onClose,
  onCreated,
  booking,
  guest,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (booking: DtlBooking) => void;
  booking?: DtlBooking;
  guest?: DtlGuest | null;
}) {
  const { displayName } = useDtlRole();
  const isEdit = !!booking;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DtlGuest[]>([]);
  const [settledQuery, setSettledQuery] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<DtlGuest | null>(guest ?? null);
  const [showCreateGuest, setShowCreateGuest] = useState(false);

  const [programId, setProgramId] = useState<number | null>(booking?.programId ?? null);
  const [durationTouched, setDurationTouched] = useState(booking?.durationMinutes != null);
  const [location, setLocation] = useState(booking?.location ?? '');
  const [time, setTime] = useState(() => toQatarInputValue(booking?.time));
  const [durationMinutes, setDurationMinutes] = useState(
    booking?.durationMinutes != null ? String(booking.durationMinutes) : '',
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const programsQuery = useQuery({
    queryKey: ['dtl-programs'],
    queryFn: listDtlPrograms,
  });

  const trimmedQuery = query.trim();
  const displayResults = trimmedQuery ? results : [];
  const searching = trimmedQuery !== '' && trimmedQuery !== settledQuery;

  useEffect(() => {
    const q = query.trim();
    if (!q) return;

    let cancelled = false;
    const handle = setTimeout(() => {
      searchDtlGuests(q)
        .then((items) => {
          if (cancelled) return;
          setResults(items);
          setSettledQuery(q);
        })
        .catch(() => {
          if (cancelled) return;
          setResults([]);
          setSettledQuery(q);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  function resetAndClose() {
    if (submitting) return;
    setQuery('');
    setResults([]);
    setSettledQuery('');
    setSelectedGuest(null);
    setProgramId(null);
    setDurationTouched(false);
    setLocation('');
    setTime('');
    setDurationMinutes('');
    setError(null);
    onClose();
  }

  async function handleSubmit() {
    setError(null);

    if (!programId) {
      setError('Select a program.');
      return;
    }
    if (!selectedGuest) {
      setError('Search for and select a guest, or create a new one.');
      return;
    }

    setSubmitting(true);
    if (booking) {
      try {
        const nextLocation = location.trim();
        const nextDuration = durationMinutes ? Number(durationMinutes) : null;
        const nextTime = time ? qatarInputToIso(time) : null;
        const programName = (id: number | null) =>
          programsQuery.data?.find((p) => p.id === id)?.name ?? (id === booking.programId ? booking.programName : '');
        const minutes = (n: number | null) => (n != null ? `${n} min` : '');

        const changed: string[] = [];
        if (selectedGuest.id !== booking.guestId) {
          changed.push(describeChange('Guest', guest?.name ?? booking.guestName ?? '', selectedGuest.name));
        }
        if (programId !== booking.programId) {
          changed.push(describeChange('Program', booking.programName, programName(programId)));
        }
        if (nextLocation !== (booking.location ?? '')) {
          changed.push(describeChange('Location', booking.location ?? '', nextLocation));
        }
        if (time !== toQatarInputValue(booking.time)) {
          changed.push(describeChange('Time', formatDtlBookingTime(booking.time), formatDtlBookingTime(nextTime)));
        }
        if (nextDuration !== booking.durationMinutes) {
          changed.push(describeChange('Duration', minutes(booking.durationMinutes), minutes(nextDuration)));
        }

        let updated = await updateDtlBooking(booking.id, {
          guestId: selectedGuest.id,
          programId,
          location: nextLocation || undefined,
          time: nextTime ?? undefined,
          durationMinutes: nextDuration ?? undefined,
        });
        if (changed.length > 0) {
          try {
            updated = await appendDtlBookingLog(
              booking.id,
              `${displayName}: Edited the booking at ${nowInQatar()} (Qatar time) — ${changed.join('; ')}`,
            );
          } catch {
            // The edit itself succeeded; the log entry is a nicety, not worth failing over.
          }
        }
        onCreated(updated);
        setSubmitting(false);
        onClose();
      } catch {
        setError('Something went wrong while saving the booking.');
        setSubmitting(false);
      }
      return;
    }
    try {
      const booking = await createDtlBooking(
        {
          guestId: selectedGuest.id,
          programId,
          location: location.trim() || undefined,
          time: time ? qatarInputToIso(time) : undefined,
          durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
        },
        displayName,
      );
      onCreated(booking);
      resetAndClose();
    } catch {
      setError('Something went wrong while creating the booking.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && resetAndClose()}>
        <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit DTL booking' : 'New DTL booking'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <section>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Guest</h3>
                <button
                  type="button"
                  onClick={() => setShowCreateGuest(true)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  + Create new guest
                </button>
              </div>

              <div className="mt-3">
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedGuest(null);
                  }}
                  placeholder="Search existing guests by name, email or phone…"
                />
                {selectedGuest ? (
                  <div className="mt-2 flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                    <span className="text-foreground">
                      {selectedGuest.name} · {selectedGuest.email || selectedGuest.phone}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedGuest(null)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-border">
                    {searching && <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>}
                    {!searching && trimmedQuery && displayResults.length === 0 && (
                      <p className="px-3 py-2 text-xs text-muted-foreground">
                        No guests found. Use "+ Create new guest" above.
                      </p>
                    )}
                    {displayResults.map((g) => (
                      <button
                        type="button"
                        key={g.id}
                        onClick={() => setSelectedGuest(g)}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        <span className="font-medium text-foreground">{g.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {g.email || g.phone || g.whatsapp}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-foreground">Booking details</h3>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="dtl-program">Program *</Label>
                  <Select
                    value={programId != null ? String(programId) : undefined}
                    onValueChange={(value) => {
                      const id = Number(value);
                      setProgramId(id);
                      const program = programsQuery.data?.find((p) => p.id === id);
                      if (program && !durationTouched && program.durationMinutes != null) {
                        setDurationMinutes(String(program.durationMinutes));
                      }
                    }}
                  >
                    <SelectTrigger id="dtl-program">
                      <SelectValue placeholder="Select a program…" />
                    </SelectTrigger>
                    <SelectContent>
                      {programsQuery.data?.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dtl-location">Location</Label>
                  <Input id="dtl-location" value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dtl-time">Date & time (Qatar)</Label>
                  <Input
                    id="dtl-time"
                    type="datetime-local"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">{QATAR_TIME_LABEL}</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dtl-duration">Duration (minutes)</Label>
                  <Input
                    id="dtl-duration"
                    type="number"
                    min="0"
                    value={durationMinutes}
                    onChange={(e) => {
                      setDurationTouched(true);
                      setDurationMinutes(e.target.value);
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dtl-created-by">Created by</Label>
                  <Input id="dtl-created-by" value={isEdit ? booking?.createdBy ?? '' : displayName} disabled />
                </div>
              </div>
            </section>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetAndClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting}>
              {isEdit
                ? submitting ? 'Saving…' : 'Save changes'
                : submitting ? 'Creating…' : 'Create booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateDtlGuestModal
        open={showCreateGuest}
        onClose={() => setShowCreateGuest(false)}
        onCreated={(guest) => {
          setSelectedGuest(guest);
          setQuery('');
          setShowCreateGuest(false);
        }}
      />
    </>
  );
}
