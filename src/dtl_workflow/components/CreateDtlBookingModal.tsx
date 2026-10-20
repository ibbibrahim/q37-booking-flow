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
  updateDtlBooking,
  updateDtlBookingStatus,
} from '../services/dtlApi';
import { useDtlRole } from '../hooks/useDtlRole';
import { nowInQatar, qatarInputToIso, QATAR_TIME_LABEL, toQatarInputValue, formatDtlBookingTime } from '../services/dtlTime';
import { DTL_BOOKING_STATUS, DTL_BOOKING_TYPE, type DtlBooking, type DtlBookingType, type DtlGuest } from '../types/dtl';
import { DTL_PEOPLE } from '../services/dtlPeople';
import { cn } from '@/lib/utils';
import { DTL_DIALOG_CONTENT_CLASS, DTL_DIALOG_FOOTER_CLASS } from './dtlDialogStyles';

function participantInput(type: DtlBookingType, id: number) {
  return type === DTL_BOOKING_TYPE.Reporter ? { type, reporterId: id } : { type, guestId: id };
}

function describeChange(label: string, from: string, to: string): string {
  return `${label}: ${from || '(empty)'} → ${to || '(empty)'}`;
}

// Pass `booking` (and its guest or reporter as `participant`) to open the modal in edit mode. Mount
// it conditionally so the form state initialises from the booking each time it opens.
export function CreateDtlBookingModal({
  open,
  onClose,
  onCreated,
  booking,
  participant,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (booking: DtlBooking) => void;
  booking?: DtlBooking;
  participant?: DtlGuest | null;
}) {
  const { displayName } = useDtlRole();
  const isEdit = !!booking;

  const [type, setType] = useState<DtlBookingType>(booking?.type ?? DTL_BOOKING_TYPE.Guest);
  const people = DTL_PEOPLE[type];
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DtlGuest[]>([]);
  const [settledQuery, setSettledQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<DtlGuest | null>(participant ?? null);
  const [showCreatePerson, setShowCreatePerson] = useState(false);

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
      DTL_PEOPLE[type].search(q)
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
  }, [query, type]);

  function changeType(next: DtlBookingType) {
    if (next === type) return;
    setType(next);
    setQuery('');
    setResults([]);
    setSettledQuery('');
    setSelectedPerson(null);
    setError(null);
  }

  function resetAndClose() {
    if (submitting) return;
    setQuery('');
    setResults([]);
    setSettledQuery('');
    setType(DTL_BOOKING_TYPE.Guest);
    setSelectedPerson(null);
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
    if (!selectedPerson) {
      setError(`Search for and select a ${people.noun}, or create a new one.`);
      return;
    }
    if (!time) {
      setError('Select a date and time.');
      return;
    }

    setSubmitting(true);
    if (booking) {
      try {
        const nextLocation = location.trim();
        const nextDuration = durationMinutes ? Number(durationMinutes) : null;
        const nextTime = qatarInputToIso(time);
        const programName = (id: number | null) =>
          programsQuery.data?.find((p) => p.id === id)?.name ?? (id === booking.programId ? booking.programName : '');
        const minutes = (n: number | null) => (n != null ? `${n} min` : '');

        const changed: string[] = [];
        const previousId = booking.type === DTL_BOOKING_TYPE.Reporter ? booking.reporterId : booking.guestId;
        if (type !== booking.type || selectedPerson.id !== previousId) {
          const previousLabel = DTL_PEOPLE[booking.type ?? DTL_BOOKING_TYPE.Guest].label;
          const previousName =
            participant?.name ?? (booking.type === DTL_BOOKING_TYPE.Reporter ? booking.reporterName : booking.guestName) ?? '';
          changed.push(
            type === booking.type
              ? describeChange(people.label, previousName, selectedPerson.name)
              : describeChange('Booked for', `${previousLabel} ${previousName}`, `${people.label} ${selectedPerson.name}`),
          );
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

        const input = {
          ...participantInput(type, selectedPerson.id),
          programId,
          location: nextLocation || undefined,
          time: nextTime,
          durationMinutes: nextDuration ?? undefined,
        };
        let updated: DtlBooking;
        if (booking.status === DTL_BOOKING_STATUS.Created) {
          updated = await updateDtlBooking(booking.id, input);
        } else {
          // The API only accepts edits on "created" bookings, so a completed/cancelled one is briefly
          // reopened, edited, then put back to its original status (no log text, so no extra log lines).
          await updateDtlBookingStatus(booking.id, DTL_BOOKING_STATUS.Created);
          try {
            await updateDtlBooking(booking.id, input);
          } finally {
            updated = await updateDtlBookingStatus(booking.id, booking.status);
          }
        }
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
          ...participantInput(type, selectedPerson.id),
          programId,
          location: location.trim() || undefined,
          time: qatarInputToIso(time),
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
        <DialogContent className={cn(DTL_DIALOG_CONTENT_CLASS, 'sm:max-w-[640px]')} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit DTL booking' : 'New DTL booking'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <section>
              <h3 className="text-sm font-semibold text-foreground">Booking for</h3>
              <div role="radiogroup" className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                {(Object.values(DTL_BOOKING_TYPE) as DtlBookingType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={type === t}
                    onClick={() => changeType(t)}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      type === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {DTL_PEOPLE[t].label}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">{people.label}</h3>
                <button
                  type="button"
                  onClick={() => setShowCreatePerson(true)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  + Create new {people.noun}
                </button>
              </div>

              <div className="mt-3">
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedPerson(null);
                  }}
                  placeholder={`Search existing ${people.noun}s by name, email or phone…`}
                />
                {selectedPerson ? (
                  <div className="mt-2 flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                    <span className="text-foreground">
                      {selectedPerson.name} · {selectedPerson.email || selectedPerson.phone}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedPerson(null)}
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
                        No {people.noun}s found. Use "+ Create new {people.noun}" above.
                      </p>
                    )}
                    {displayResults.map((g) => (
                      <button
                        type="button"
                        key={g.id}
                        onClick={() => setSelectedPerson(g)}
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
                  <Label htmlFor="dtl-time">Date & time (Qatar) *</Label>
                  <Input
                    id="dtl-time"
                    type="datetime-local"
                    value={time}
                    required
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

          <DialogFooter className={DTL_DIALOG_FOOTER_CLASS}>
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
        kind={type}
        open={showCreatePerson}
        onClose={() => setShowCreatePerson(false)}
        onCreated={(person) => {
          setSelectedPerson(person);
          setQuery('');
          setShowCreatePerson(false);
        }}
      />
    </>
  );
}
