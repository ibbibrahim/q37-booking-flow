import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Printer } from 'lucide-react';
import { RotaCalendar } from '../components/RotaCalendar';
import { rotaApi } from '../api/rotaApi';
import { getWeekDates, formatDateDisplay } from '../utils/dateUtils';
import type { RotaDepartment } from '../types/rota';

export function PublicRotaPage() {
  const { uuid } = useParams<{ uuid: string }>();

  const {
    data: week,
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: ['rotaPublicWeek', uuid],
    queryFn: () => rotaApi.getPublicWeek(uuid!),
    enabled: !!uuid,
    retry: false,
  });

  const handlePrint = () => {
    window.print();
  };

  if (!uuid) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Invalid Link</AlertTitle>
          <AlertDescription>
            This shared rota link is invalid or missing.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isError) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 400 || status === 404) {
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Link Expired</AlertTitle>
            <AlertDescription>
              This shared rota link has expired or is no longer valid.
            </AlertDescription>
          </Alert>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load the rota. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading || !week) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4" />
          <p className="text-muted-foreground">Loading rota...</p>
        </div>
      </div>
    );
  }

  const weekStart = new Date(week.weekStartDate);
  const weekDates = getWeekDates(weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const department: RotaDepartment = {
    id: week.departmentId,
    name: week.departmentName,
    color: '#6366f1',
    morningRequired: week.morningRequired ?? 1,
    eveningRequired: week.eveningRequired ?? 1,
    nightRequired: week.nightRequired ?? 1,
    isActive: true,
  };

  // Build minimal employee list from assignments for display
  const employeesMap = new Map(
    week.assignments.map((a) => [
      a.employeeId,
      {
        id: a.employeeId,
        name: a.employeeName,
        departmentId: week.departmentId,
        isActive: true,
      },
    ])
  );
  const employees = Array.from(employeesMap.values());

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 print:p-4">
      <div className="max-w-6xl mx-auto space-y-4 print:max-w-none">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:flex-row">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {week.departmentName} Rota
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDateDisplay(weekStart)} - {formatDateDisplay(weekEnd)}{' '}
              {weekEnd.getFullYear()}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="print:hidden">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>

        <RotaCalendar
          week={week}
          department={department}
          employees={employees}
          weekDates={weekDates}
          isLoading={false}
          readOnly
          onAssign={() => {}}
          onRemove={() => {}}
        />
      </div>
    </div>
  );
}
