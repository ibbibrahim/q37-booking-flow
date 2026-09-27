import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, Users, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { listDtlBookings, listDtlGuests } from '../services/dtlApi';
import { useDtlBookingChanged } from '../hooks/useDtlBookingChanged';
import { DTL_BOOKING_STATUS } from '../types/dtl';
import { DtlGuestBookingReport } from './DtlGuestBookingReport';

function StatCard({
  icon: Icon,
  label,
  value,
  isLoading,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="rounded-full bg-primary/10 p-3">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">{isLoading ? '—' : value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DtlDashboardPage() {
  const queryClient = useQueryClient();

  useDtlBookingChanged(() => {
    queryClient.invalidateQueries({ queryKey: ['dtl-dashboard-bookings-total'] });
    queryClient.invalidateQueries({ queryKey: ['dtl-dashboard-bookings-completed'] });
    queryClient.invalidateQueries({ queryKey: ['dtl-dashboard-bookings-cancelled'] });
  });

  const guestsQuery = useQuery({
    queryKey: ['dtl-dashboard-guests-total'],
    queryFn: () => listDtlGuests({ page: 1, perPage: 1 }),
    refetchOnMount: 'always',
  });

  const bookingsQuery = useQuery({
    queryKey: ['dtl-dashboard-bookings-total'],
    queryFn: () => listDtlBookings({ page: 1, perPage: 1 }),
    refetchOnMount: 'always',
  });

  const completedQuery = useQuery({
    queryKey: ['dtl-dashboard-bookings-completed'],
    queryFn: () => listDtlBookings({ page: 1, perPage: 1, status: DTL_BOOKING_STATUS.Completed }),
    refetchOnMount: 'always',
  });

  const cancelledQuery = useQuery({
    queryKey: ['dtl-dashboard-bookings-cancelled'],
    queryFn: () => listDtlBookings({ page: 1, perPage: 1, status: DTL_BOOKING_STATUS.Cancelled }),
    refetchOnMount: 'always',
  });

  const totalBookings = bookingsQuery.data?.totalItems ?? 0;
  const completed = completedQuery.data?.totalItems ?? 0;
  const cancelled = cancelledQuery.data?.totalItems ?? 0;
  const active = Math.max(totalBookings - completed - cancelled, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Guests"
          value={guestsQuery.data?.totalItems ?? 0}
          isLoading={guestsQuery.isLoading}
        />
        <StatCard icon={CalendarClock} label="Active bookings" value={active} isLoading={bookingsQuery.isLoading} />
        <StatCard icon={CheckCircle2} label="Completed" value={completed} isLoading={completedQuery.isLoading} />
        <StatCard icon={XCircle} label="Cancelled" value={cancelled} isLoading={cancelledQuery.isLoading} />
      </div>

      <DtlGuestBookingReport />
    </div>
  );
}
