import React, { useState, useMemo } from 'react';
import { Download, Filter, Calendar, X, Search, ChevronDown, Clock, Users, Briefcase, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CALL_SHEET_ROLES } from '../types/callsheet';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface CrewMember {
  id: string;
  name: string;
  role: string;
}

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

const MOCK_CREW_MEMBERS: CrewMember[] = [
  { id: '1', name: 'Jennifer Williams', role: 'Producer' },
  { id: '2', name: 'Dr. Samira Patel', role: 'Producer' },
  { id: '3', name: 'Michael Chen', role: 'Director' },
  { id: '4', name: 'Sarah Johnson', role: 'Camera 1' },
  { id: '5', name: 'Alex Rodriguez', role: 'Camera 2' },
  { id: '6', name: 'Emily Parker', role: 'Sound Technician' },
  { id: '7', name: 'David Kim', role: 'Assistant Director' },
  { id: '8', name: 'Lisa Anderson', role: 'Presenter' },
  { id: '9', name: 'James Wilson', role: 'Camera Assistant' },
  { id: '10', name: 'Maria Garcia', role: 'Studio Operator' },
];

const QUICK_DATE_RANGES = [
  { label: '24 hours', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '12 months', days: 365 },
];

export const CallSheetAnalytics: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedQuickRange, setSelectedQuickRange] = useState<number>(30);

  const filteredCrewMembers = useMemo(() => {
    let members = MOCK_CREW_MEMBERS;

    if (selectedRoles.length > 0) {
      members = members.filter(m => selectedRoles.includes(m.role));
    }

    if (memberSearchQuery) {
      members = members.filter(m =>
        m.name.toLowerCase().includes(memberSearchQuery.toLowerCase())
      );
    }

    return members;
  }, [selectedRoles, memberSearchQuery]);

  const filteredRoles = useMemo(() => {
    if (!roleSearchQuery) return CALL_SHEET_ROLES;
    return CALL_SHEET_ROLES.filter(role =>
      role.toLowerCase().includes(roleSearchQuery.toLowerCase())
    );
  }, [roleSearchQuery]);

  const mockAnalytics: AnalyticsData = useMemo(() => {
    if (selectedMembers.length > 0) {
      return {
        totalAssignments: 24,
        programsWorked: 8,
        totalHours: 186,
        rolesPerformed: selectedMembers.length === 1 ? 1 : 3,
        totalCallSheets: 12,
        avgCrewSize: 8,
        completionRate: 92,
        avgDuration: 7.75,
      };
    }

    return {
      totalAssignments: 0,
      programsWorked: 0,
      totalHours: 0,
      rolesPerformed: 0,
      totalCallSheets: 0,
      avgCrewSize: 0,
      completionRate: 0,
      avgDuration: 0,
    };
  }, [selectedMembers]);

  const handleQuickDateRange = (days: number) => {
    const to = new Date();
    const from = subDays(to, days);
    setDateRange({ from, to });
    setSelectedQuickRange(days);
  };

  const handleRoleToggle = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
    setSelectedMembers([]);
  };

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleClearAll = () => {
    setDateRange({ from: undefined, to: undefined });
    setSelectedRoles([]);
    setSelectedMembers([]);
    setSearchQuery('');
    setRoleSearchQuery('');
    setMemberSearchQuery('');
    setSelectedQuickRange(30);
  };

  const handleExport = async () => {
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('Exporting to Excel...');
    setIsExporting(false);
  };

  const hasActiveFilters = selectedRoles.length > 0 || selectedMembers.length > 0 || searchQuery || dateRange.from || dateRange.to;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">Call Sheet Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track and analyze call sheet performance and crew assignments
          </p>
        </div>
        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="gap-2"
        >
          <Download size={18} />
          {isExporting ? 'Exporting...' : 'Export to Excel'}
        </Button>
      </div>

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

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-muted-foreground" />
            <CardTitle className="text-base">Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal"
                >
                  <Calendar size={16} className="mr-2" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'MM/dd/yyyy')} - {format(dateRange.to, 'MM/dd/yyyy')}
                      </>
                    ) : (
                      format(dateRange.from, 'MM/dd/yyyy')
                    )
                  ) : (
                    'Select date range'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 border-b">
                  <p className="text-sm font-medium">Quick ranges</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const today = new Date();
                        setDateRange({ from: today, to: today });
                      }}
                    >
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const yesterday = subDays(new Date(), 1);
                        setDateRange({ from: yesterday, to: yesterday });
                      }}
                    >
                      Yesterday
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const to = new Date();
                        const from = subDays(to, 7);
                        setDateRange({ from, to });
                      }}
                    >
                      Last week
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const to = new Date();
                        const from = subDays(to, 30);
                        setDateRange({ from, to });
                      }}
                    >
                      Last month
                    </Button>
                  </div>
                </div>
                <CalendarComponent
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

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
                        <div key={member.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`member-${member.id}`}
                            checked={selectedMembers.includes(member.id)}
                            onCheckedChange={() => handleMemberToggle(member.id)}
                          />
                          <Label
                            htmlFor={`member-${member.id}`}
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            <div>
                              <p>{member.name}</p>
                              <p className="text-xs text-muted-foreground">{member.role}</p>
                            </div>
                          </Label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {selectedRoles.length > 0
                          ? 'No crew members found for selected roles'
                          : 'Select a role first to see crew members'}
                      </p>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search all fields (title, location, crew, program...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

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

              {selectedMembers.map((memberId) => {
                const member = MOCK_CREW_MEMBERS.find(m => m.id === memberId);
                return member ? (
                  <Badge key={memberId} variant="secondary" className="gap-1">
                    <Users size={12} />
                    {member.name}
                    <button
                      onClick={() => handleMemberToggle(memberId)}
                      className="ml-1 hover:bg-muted-foreground/20 rounded-full"
                    >
                      <X size={12} />
                    </button>
                  </Badge>
                ) : null;
              })}

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Assignments</p>
                <p className="text-3xl font-bold mt-2">{mockAnalytics.totalAssignments}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  For {selectedMembers.length || 'all'} member{selectedMembers.length !== 1 ? 's' : ''}
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
                <p className="text-3xl font-bold mt-2">{mockAnalytics.programsWorked}</p>
                <p className="text-xs text-muted-foreground mt-1">Different programs</p>
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
                <p className="text-3xl font-bold mt-2">{mockAnalytics.totalHours}h</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg. {mockAnalytics.totalAssignments > 0
                    ? (mockAnalytics.totalHours / mockAnalytics.totalAssignments).toFixed(1)
                    : 0}h per assignment
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
                <p className="text-3xl font-bold mt-2">{mockAnalytics.rolesPerformed}</p>
                <p className="text-xs text-muted-foreground mt-1">Different roles</p>
              </div>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Users size={20} className="text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Call Sheet Timeline</CardTitle>
          <p className="text-sm text-muted-foreground">
            {selectedMembers.length > 0
              ? `${mockAnalytics.totalCallSheets} call sheets found for selected members`
              : '0 call sheets found'}
          </p>
        </CardHeader>
        <CardContent>
          {selectedMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Select crew roles and members to view analytics
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Call sheet timeline will be displayed here based on API data
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
