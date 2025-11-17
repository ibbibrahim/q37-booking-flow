import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { callSheetApi, type CallSheetFilters } from '../services/mockCallSheetApi';
import { CallsheetAnalyticsFilters } from './CallsheetAnalyticsFilters';
import { CallsheetAnalyticsCards } from './CallsheetAnalyticsCards';
import { CallsheetPagination } from './CallsheetPagination';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface AnalyticsState {
  startDate?: Date;
  endDate?: Date;
  selectedRoles: string[];
  selectedMembers: string[];
  searchQuery: string;
  page: number;
  pageSize: number;
}

export const CallsheetAnalyticsDashboard: React.FC = () => {
  const { showToast } = useToast();

  // Filter state
  const [filters, setFilters] = useState<AnalyticsState>({
    startDate: undefined,
    endDate: undefined,
    selectedRoles: [],
    selectedMembers: [],
    searchQuery: '',
    page: 1,
    pageSize: 10,
  });

  // Data state
  const [crewRoles, setCrewRoles] = useState<string[]>([]);
  const [crewMembers, setCrewMembers] = useState<string[]>([]);
  const [callSheets, setCallSheets] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [analytics, setAnalytics] = useState({
    totalAssignments: 0,
    totalUniqueCrew: 0,
    totalHoursWorked: 0,
    completedCallsheets: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch crew roles
  useEffect(() => {
    const fetchCrewRoles = async () => {
      try {
        const roles = await callSheetApi.getCrewRoles();
        setCrewRoles(roles);
      } catch (error) {
        console.error('Failed to fetch crew roles:', error);
      }
    };

    fetchCrewRoles();
  }, []);

  // Fetch crew members when roles change
  useEffect(() => {
    const fetchCrewMembers = async () => {
      try {
        const members = await callSheetApi.getCrewMembers(
          filters.selectedRoles.length > 0 ? filters.selectedRoles : undefined
        );
        setCrewMembers(members);
      } catch (error) {
        console.error('Failed to fetch crew members:', error);
      }
    };

    fetchCrewMembers();
  }, [filters.selectedRoles]);

  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiFilters: CallSheetFilters = {
        startDate: filters.startDate ? format(filters.startDate, 'yyyy-MM-dd') : undefined,
        endDate: filters.endDate ? format(filters.endDate, 'yyyy-MM-dd') : undefined,
        crewRoles: filters.selectedRoles.length > 0 ? filters.selectedRoles : undefined,
        crewMembers: filters.selectedMembers.length > 0 ? filters.selectedMembers : undefined,
        searchQuery: filters.searchQuery || undefined,
        page: filters.page,
        pageSize: filters.pageSize,
      };

      const response = await callSheetApi.getCallSheetsAnalytics(apiFilters);

      setCallSheets(response.items);
      setTotal(response.total);
      setTotalPages(response.totalPages);

      // Calculate analytics
      const uniqueCrew = new Set<string>();
      let totalAssignments = 0;
      let totalHours = 0;
      let completed = 0;

      response.items.forEach(cs => {
        if (cs.status === 'Completed') completed++;

        cs.crewAssignments?.forEach((crew: any) => {
          uniqueCrew.add(crew.name);
          totalAssignments++;

          // Calculate hours from callTime and wrapTime
          if (cs.callTime && cs.wrapTime) {
            const [callHour, callMin] = cs.callTime.split(':').map(Number);
            const [wrapHour, wrapMin] = cs.wrapTime.split(':').map(Number);
            const callMinutes = callHour * 60 + callMin;
            const wrapMinutes = wrapHour * 60 + wrapMin;
            const duration = wrapMinutes > callMinutes
              ? wrapMinutes - callMinutes
              : (24 * 60 - callMinutes) + wrapMinutes;
            totalHours += duration;
          }
        });
      });

      setAnalytics({
        totalAssignments,
        totalUniqueCrew: uniqueCrew.size,
        totalHoursWorked: totalHours,
        completedCallsheets: completed,
      });
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
      showToast('Failed to load analytics data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [filters, showToast]);

  // Fetch data when filters change
  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const handleDateRangeChange = (start: Date | undefined, end: Date | undefined) => {
    setFilters(prev => ({
      ...prev,
      startDate: start,
      endDate: end,
      page: 1, // Reset to first page
    }));
  };

  const handleRolesChange = (roles: string[]) => {
    setFilters(prev => ({
      ...prev,
      selectedRoles: roles,
      page: 1,
    }));
  };

  const handleMembersChange = (members: string[]) => {
    setFilters(prev => ({
      ...prev,
      selectedMembers: members,
      page: 1,
    }));
  };

  const handleSearchChange = (query: string) => {
    setFilters(prev => ({
      ...prev,
      searchQuery: query,
      page: 1,
    }));
  };

  const handleClearAll = () => {
    setFilters({
      startDate: undefined,
      endDate: undefined,
      selectedRoles: [],
      selectedMembers: [],
      searchQuery: '',
      page: 1,
      pageSize: 10,
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Prepare CSV data
      const headers = [
        'Date',
        'Title',
        'Department',
        'Location',
        'Status',
        'Crew Count',
        'Duration (hours)',
      ];

      const rows = callSheets.map(cs => {
        const callTime = cs.callTime || '';
        const wrapTime = cs.wrapTime || '';
        let duration = 'N/A';

        if (callTime && wrapTime) {
          const [callHour, callMin] = callTime.split(':').map(Number);
          const [wrapHour, wrapMin] = wrapTime.split(':').map(Number);
          const callMinutes = callHour * 60 + callMin;
          const wrapMinutes = wrapHour * 60 + wrapMin;
          const durationMins = wrapMinutes > callMinutes
            ? wrapMinutes - callMinutes
            : (24 * 60 - callMinutes) + wrapMinutes;
          duration = (durationMins / 60).toFixed(2);
        }

        return [
          format(new Date(cs.filmingDate), 'yyyy-MM-dd'),
          cs.title,
          cs.department,
          cs.location,
          cs.status,
          cs.crewAssignments?.length || 0,
          duration,
        ];
      });

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `callsheet-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Analytics exported successfully', 'success');
    } catch (error) {
      console.error('Failed to export:', error);
      showToast('Failed to export analytics', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Draft': 'bg-gray-100 text-gray-800',
      'Pending Approval': 'bg-yellow-100 text-yellow-800',
      'Approved': 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-purple-100 text-purple-800',
      'Completed': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Call Sheet Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Track and analyze call sheet performance and crew assignments
        </p>
      </div>

      {/* Filters */}
      <CallsheetAnalyticsFilters
        crewRoles={crewRoles}
        crewMembers={crewMembers}
        selectedRoles={filters.selectedRoles}
        selectedMembers={filters.selectedMembers}
        searchQuery={filters.searchQuery}
        startDate={filters.startDate}
        endDate={filters.endDate}
        onRolesChange={handleRolesChange}
        onMembersChange={handleMembersChange}
        onSearchChange={handleSearchChange}
        onDateRangeChange={handleDateRangeChange}
        onClearAll={handleClearAll}
        onExport={handleExport}
        isLoading={isLoading}
        isExporting={isExporting}
      />

      {/* Analytics Cards */}
      <CallsheetAnalyticsCards data={analytics} isLoading={isLoading} />

      {/* Call Sheets Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Crew</TableHead>
                <TableHead className="text-right">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : callSheets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No call sheets found
                  </TableCell>
                </TableRow>
              ) : (
                callSheets.map(cs => {
                  const callTime = cs.callTime || '';
                  const wrapTime = cs.wrapTime || '';
                  let duration = 'N/A';

                  if (callTime && wrapTime) {
                    const [callHour, callMin] = callTime.split(':').map(Number);
                    const [wrapHour, wrapMin] = wrapTime.split(':').map(Number);
                    const callMinutes = callHour * 60 + callMin;
                    const wrapMinutes = wrapHour * 60 + wrapMin;
                    const durationMins = wrapMinutes > callMinutes
                      ? wrapMinutes - callMinutes
                      : (24 * 60 - callMinutes) + wrapMinutes;
                    const hours = Math.floor(durationMins / 60);
                    const mins = durationMins % 60;
                    duration = `${hours}h ${mins}m`;
                  }

                  return (
                    <TableRow key={cs.id} className="hover:bg-muted/50 cursor-pointer">
                      <TableCell className="font-medium">
                        {format(new Date(cs.filmingDate), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>{cs.title}</TableCell>
                      <TableCell className="text-sm">{cs.department}</TableCell>
                      <TableCell className="text-sm">{cs.location}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(cs.status)}>
                          {cs.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{cs.crewAssignments?.length || 0}</TableCell>
                      <TableCell className="text-right text-sm">{duration}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination */}
      {!isLoading && (
        <CallsheetPagination
          currentPage={filters.page}
          pageSize={filters.pageSize}
          totalPages={totalPages}
          total={total}
          onPageChange={page => setFilters(prev => ({ ...prev, page }))}
          onPageSizeChange={pageSize => setFilters(prev => ({ ...prev, pageSize, page: 1 }))}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};
