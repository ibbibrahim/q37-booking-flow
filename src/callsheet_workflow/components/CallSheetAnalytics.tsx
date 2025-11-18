import React, { useState, useMemo, useEffect } from 'react';
import {
  Download,
  Filter,
  X,
  Search,
  ChevronDown,
  Clock,
  Users,
  Briefcase,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DateRangePicker } from '@/components/DateRangePicker';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from '@/components/ui/pagination';
import { CALL_SHEET_ROLES } from '../types/callsheet';
import { callSheetApi } from '../services/mockCallSheetApi';
import { format, subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface AnalyticsData {
  totalAssignments: number;
  programsWorked: number;
  totalHours: number;
  rolesPerformed: number;
  totalCallSheets: number;
  avgCrewSize: number;
  completionRate: number;
  avgDuration: number;
}

interface CrewAssignmentResult {
  name: string;
  role: string;
  phone?: string;
}

interface CallSheetResult {
  id: number;
  title: string;
  filmingDate: string;
  location: string;
  department: string;
  status: string;
  crewSize: number;
  durationHours: number;
  crewAssignments: CrewAssignmentResult[];
}

interface MemberStats {
  totalCallSheets: number;
  totalHours: number;
  avgDuration: number;
  callSheets: CallSheetResult[];
}

const QUICK_DATE_RANGES = [
  { label: '24 hours', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '12 months', days: 365 }
];

export const CallSheetAnalytics: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const to = new Date();
    const from = subDays(to, 1);
    return { from, to };
  });
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedQuickRange, setSelectedQuickRange] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [crewMembers, setCrewMembers] = useState<string[]>([]);
  const [callSheetResults, setCallSheetResults] = useState<CallSheetResult[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalAssignments: 0,
    programsWorked: 0,
    totalHours: 0,
    rolesPerformed: 0,
    totalCallSheets: 0,
    avgCrewSize: 0,
    completionRate: 0,
    avgDuration: 0
  });

  const [memberStats, setMemberStats] = useState<Record<string, MemberStats>>({});

  // Load crew members whenever roles change
  useEffect(() => {
    loadCrewMembers();
  }, [selectedRoles]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setCurrentPage(1);
    loadAnalytics(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, selectedRoles, selectedMembers, searchQuery]);

  // Load when page changes
  useEffect(() => {
    loadAnalytics(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const loadCrewMembers = async () => {
    try {
      const members = await callSheetApi.getCrewMembers(selectedRoles);
      setCrewMembers(members);
    } catch (error) {
      console.error('Failed to load crew members:', error);
      setCrewMembers([]);
    }
  };

  const loadAnalytics = async (page: number) => {
    setIsLoading(true);
    try {
      const filters = {
        dateFrom: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        dateTo: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
        roles: selectedRoles.length > 0 ? selectedRoles : undefined,
        crewMembers: selectedMembers.length > 0 ? selectedMembers : undefined,
        searchQuery: searchQuery || undefined,
        page,
        pageSize
      };

      const result = await callSheetApi.searchCallSheets(filters);

      const items: CallSheetResult[] = (result.items || []) as CallSheetResult[];

      setCallSheetResults(items);
      const total = result.total || 0;
      setTotalCount(total);
      setTotalPages(Math.ceil(total / pageSize));

      const totalCallSheetsOnPage = items.length;
      const uniquePrograms = new Set(items.map((cs) => cs.department));
      const uniqueRoles = new Set(
        items.flatMap((cs) => cs.crewAssignments?.map((crew) => crew.role) || [])
      );

      const totalAssignments =
        items.reduce(
          (sum, cs) => sum + (cs.crewAssignments?.length || cs.crewSize || 0),
          0
        ) || 0;

      const totalCrewSize =
        items.reduce(
          (sum, cs) => sum + (cs.crewSize || cs.crewAssignments?.length || 0),
          0
        ) || 0;

      const totalHoursFromAPI =
        items.reduce((sum, cs) => sum + (cs.durationHours || 0), 0) || 0;

      setAnalytics({
        totalCallSheets: total,
        totalAssignments,
        programsWorked: uniquePrograms.size,
        rolesPerformed: uniqueRoles.size,
        totalHours: totalHoursFromAPI,
        avgCrewSize:
          totalCallSheetsOnPage > 0
            ? Math.round(totalCrewSize / totalCallSheetsOnPage)
            : 0,
        completionRate: 92, // placeholder
        avgDuration:
          totalCallSheetsOnPage > 0
            ? totalHoursFromAPI / totalCallSheetsOnPage
            : 0
      });

      // ---- Per-member stats (only if members selected) ----
      if (selectedMembers.length === 0) {
        setMemberStats({});
      } else {
        const stats: Record<string, MemberStats> = {};

        selectedMembers.forEach((memberName) => {
          // All callsheets (from current result set) where this member appears
          const memberSheets = items.filter((cs) =>
            cs.crewAssignments?.some(
              (a) => a.name.toLowerCase() === memberName.toLowerCase()
            )
          );

          const totalMemberCallSheets = memberSheets.length;
          const totalMemberHours =
            memberSheets.reduce(
              (sum, cs) => sum + (cs.durationHours || 0),
              0
            ) || 0;
          const avgMemberDuration =
            totalMemberCallSheets > 0
              ? totalMemberHours / totalMemberCallSheets
              : 0;

          stats[memberName] = {
            totalCallSheets: totalMemberCallSheets,
            totalHours: totalMemberHours,
            avgDuration: avgMemberDuration,
            callSheets: memberSheets
          };
        });

        setMemberStats(stats);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCrewMembers = useMemo(() => {
    let members = crewMembers;

    if (memberSearchQuery) {
      members = members.filter((m) =>
        m.toLowerCase().includes(memberSearchQuery.toLowerCase())
      );
    }

    return members;
  }, [crewMembers, memberSearchQuery]);

  const filteredRoles = useMemo(() => {
    if (!roleSearchQuery) return CALL_SHEET_ROLES;
    return CALL_SHEET_ROLES.filter((role) =>
      role.toLowerCase().includes(roleSearchQuery.toLowerCase())
    );
  }, [roleSearchQuery]);

  const handleQuickDateRange = (days: number) => {
    const to = new Date();
    const from = subDays(to, days);
    setDateRange({ from, to });
    setSelectedQuickRange(days);
  };

  const handleRoleToggle = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
    setSelectedMembers([]);
  };

  const handleMemberToggle = (memberName: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberName)
        ? prev.filter((name) => name !== memberName)
        : [...prev, memberName]
    );
  };

  const handleClearAll = () => {
    const to = new Date();
    const from = subDays(to, 1);
    setDateRange({ from, to });
    setSelectedRoles([]);
    setSelectedMembers([]);
    setSearchQuery('');
    setRoleSearchQuery('');
    setMemberSearchQuery('');
    setSelectedQuickRange(1);
  };

  const handleExport = async () => {
    setIsExporting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log('Exporting to Excel...');
    setIsExporting(false);
  };

  const hasActiveFilters =
    selectedRoles.length > 0 || selectedMembers.length > 0 || searchQuery;

  return (
    <div className="space-y-6">
      {/* Top quick ranges */}
      <div className="flex gap-2">
        {QUICK_DATE_RANGES.map((range) => (
          <Button
            key={range.days}
            variant={selectedQuickRange === range.days ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleQuickDateRange(range.days)}
          >
            {range.label}
          </Button>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-muted-foreground" />
            <CardTitle className="text-base">Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              className="w-full"
            />

            {/* Roles */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-between">
                  <span className="flex items-center gap-2">
                    <Filter size={16} />
                    {selectedRoles.length > 0
                      ? `${selectedRoles.length} role(s) selected`
                      : 'Select Crew Roles'}
                  </span>
                  <ChevronDown size={16} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-3">
                  <Input
                    placeholder="Search roles..."
                    value={roleSearchQuery}
                    onChange={(e) => setRoleSearchQuery(e.target.value)}
                    className="h-9"
                  />
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {filteredRoles.map((role) => (
                      <div key={role} className="flex items-center space-x-2">
                        <Checkbox
                          id={`role-${role}`}
                          checked={selectedRoles.includes(role)}
                          onCheckedChange={() => handleRoleToggle(role)}
                        />
                        <Label
                          htmlFor={`role-${role}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {role}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Members */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-between">
                  <span className="flex items-center gap-2">
                    <Users size={16} />
                    {selectedMembers.length > 0
                      ? `${selectedMembers.length} member(s) selected`
                      : 'Select Crew Members'}
                  </span>
                  <ChevronDown size={16} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-3">
                  <Input
                    placeholder="Search crew members..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    className="h-9"
                  />
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {filteredCrewMembers.length > 0 ? (
                      filteredCrewMembers.map((member) => (
                        <div key={member} className="flex items-center space-x-2">
                          <Checkbox
                            id={`member-${member}`}
                            checked={selectedMembers.includes(member)}
                            onCheckedChange={() => handleMemberToggle(member)}
                          />
                          <Label
                            htmlFor={`member-${member}`}
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            {member}
                          </Label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {selectedRoles.length > 0
                          ? 'No crew members found for selected roles'
                          : 'Select a role first or loading...'}
                      </p>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Text search */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Search all fields (title, location, crew, program...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Active filters chips */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Active filters:</span>

              {selectedRoles.map((role) => (
                <Badge key={role} variant="secondary" className="gap-1">
                  <Users size={12} />
                  {role}
                  <button
                    onClick={() => handleRoleToggle(role)}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full"
                  >
                    <X size={12} />
                  </button>
                </Badge>
              ))}

              {selectedMembers.map((memberName) => (
                <Badge key={memberName} variant="secondary" className="gap-1">
                  <Users size={12} />
                  {memberName}
                  <button
                    onClick={() => handleMemberToggle(memberName)}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full"
                  >
                    <X size={12} />
                  </button>
                </Badge>
              ))}

              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  <Search size={12} />
                  "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full"
                  >
                    <X size={12} />
                  </button>
                </Badge>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-6 text-xs"
              >
                Clear All
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Global stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Assignments</p>
                <p className="text-3xl font-bold mt-2">
                  {isLoading ? '...' : analytics.totalAssignments}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedMembers.length > 0
                    ? `For ${selectedMembers.length} member${
                        selectedMembers.length !== 1 ? 's' : ''
                      }`
                    : 'All crew members'}
                </p>
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Briefcase size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Programs Worked</p>
                <p className="text-3xl font-bold mt-2">
                  {isLoading ? '...' : analytics.programsWorked}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Different programs
                </p>
              </div>
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <TrendingUp size={20} className="text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Hours Worked</p>
                <p className="text-3xl font-bold mt-2">
                  {isLoading ? '...' : `${analytics.totalHours.toFixed(1)}h`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg.{' '}
                  {analytics.totalAssignments > 0
                    ? (analytics.totalHours / analytics.totalAssignments).toFixed(1)
                    : 0}
                  h per assignment
                </p>
              </div>
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Clock size={20} className="text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Roles Performed</p>
                <p className="text-3xl font-bold mt-2">
                  {isLoading ? '...' : analytics.rolesPerformed}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Different roles</p>
              </div>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Users size={20} className="text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Member stats block (only when members selected) */}
      {selectedMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Member Stats</CardTitle>
            <p className="text-sm text-muted-foreground">
              Per-member breakdown for selected crew within current filters.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedMembers.map((memberName) => {
              const stats = memberStats[memberName];

              if (!stats) {
                return (
                  <div
                    key={memberName}
                    className="border border-dashed border-border rounded-lg p-3 text-sm text-muted-foreground"
                  >
                    No data found for <span className="font-medium">{memberName}</span>{' '}
                    in this range.
                  </div>
                );
              }

              return (
                <div
                  key={memberName}
                  className="border border-border rounded-lg p-4 space-y-3 bg-muted/30"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-card-foreground">
                        {memberName}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stats.totalCallSheets} call sheet
                        {stats.totalCallSheets !== 1 ? 's' : ''} ·{' '}
                        {stats.totalHours.toFixed(1)}h total · Avg{' '}
                        {stats.avgDuration.toFixed(1)}h
                      </p>
                    </div>
                  </div>

                  {/* List of call sheets for this member */}
                  <div className="space-y-2">
                    {stats.callSheets.map((cs) => (
                      <div
                        key={cs.id}
                        className="flex items-center justify-between text-xs border border-border rounded-md px-2 py-2 bg-background/60"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm text-card-foreground">
                            {cs.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex flex-wrap gap-2">
                            <span>{cs.department}</span>
                            <span>•</span>
                            <span>{cs.location}</span>
                            <span>•</span>
                            <span>
                              {format(new Date(cs.filmingDate), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        </div>
                        <div className="text-right text-[11px] text-muted-foreground min-w-[60px]">
                          {cs.durationHours.toFixed(1)}h
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Timeline + pagination */}
      <Card>
        <CardHeader>
          <CardTitle>Call Sheet Timeline</CardTitle>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? 'Loading...'
              : `${analytics.totalCallSheets} call sheet${
                  analytics.totalCallSheets !== 1 ? 's' : ''
                } found`}
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4" />
              <p className="text-muted-foreground">Loading analytics data...</p>
            </div>
          ) : analytics.totalCallSheets === 0 ? (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No call sheets found matching your filters
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                {callSheetResults.map((callSheet) => (
                  <div
                    key={callSheet.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-card-foreground">
                        {callSheet.title}
                      </h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                        <span>{callSheet.department}</span>
                        <span>•</span>
                        <span>{callSheet.location}</span>
                        <span>•</span>
                        <span>
                          {format(new Date(callSheet.filmingDate), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary">{callSheet.status}</Badge>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * pageSize + 1} to{' '}
                    {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            currentPage > 1 && setCurrentPage(currentPage - 1)
                          }
                          className={
                            currentPage === 1
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                        />
                      </PaginationItem>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => {
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 &&
                              page <= currentPage + 1)
                          ) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => setCurrentPage(page)}
                                  isActive={currentPage === page}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          } else if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                          ) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }
                          return null;
                        }
                      )}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            currentPage < totalPages &&
                            setCurrentPage(currentPage + 1)
                          }
                          className={
                            currentPage === totalPages
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                </div>
              )}

              {totalPages === 1 && totalCount > 0 && (
                <p className="text-sm text-muted-foreground text-center pt-4 border-t border-border">
                  Showing all {totalCount} results
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
