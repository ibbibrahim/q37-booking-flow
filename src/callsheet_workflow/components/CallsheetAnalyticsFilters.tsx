import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { MultiSelect } from '@/components/ui/multi-select';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface CallsheetAnalyticsFiltersProps {
  crewRoles: string[];
  crewMembers: string[];
  selectedRoles: string[];
  selectedMembers: string[];
  searchQuery: string;
  startDate?: Date;
  endDate?: Date;
  onRolesChange: (roles: string[]) => void;
  onMembersChange: (members: string[]) => void;
  onSearchChange: (query: string) => void;
  onDateRangeChange: (start: Date | undefined, end: Date | undefined) => void;
  onClearAll: () => void;
  onExport: () => void;
  isLoading?: boolean;
  isExporting?: boolean;
}

export const CallsheetAnalyticsFilters: React.FC<CallsheetAnalyticsFiltersProps> = ({
  crewRoles,
  crewMembers,
  selectedRoles,
  selectedMembers,
  searchQuery,
  startDate,
  endDate,
  onRolesChange,
  onMembersChange,
  onSearchChange,
  onDateRangeChange,
  onClearAll,
  onExport,
  isLoading = false,
  isExporting = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasActiveFilters =
    selectedRoles.length > 0 ||
    selectedMembers.length > 0 ||
    searchQuery.length > 0 ||
    startDate ||
    endDate;

  return (
    <div className="space-y-4">
      {/* Top Bar - Desktop */}
      <div className="hidden md:block">
        <Card className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Date Range */}
            <div className="lg:col-span-3">
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onDateRangeChange={onDateRangeChange}
                placeholder="Select date range"
              />
            </div>

            {/* Crew Roles */}
            <div className="lg:col-span-3">
              <MultiSelect
                options={crewRoles}
                selected={selectedRoles}
                onChange={onRolesChange}
                placeholder="Select crew roles..."
                label="Crew Roles"
                searchable={true}
                isLoading={isLoading}
              />
            </div>

            {/* Crew Members */}
            <div className="lg:col-span-3">
              <MultiSelect
                options={crewMembers}
                selected={selectedMembers}
                onChange={onMembersChange}
                placeholder="Select crew members..."
                label="Crew Members"
                searchable={true}
                isLoading={isLoading}
              />
            </div>

            {/* Actions */}
            <div className="lg:col-span-3 flex gap-2 items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={onClearAll}
                disabled={!hasActiveFilters || isLoading}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
              <Button
                size="sm"
                onClick={onExport}
                disabled={isExporting}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-4 w-4 mr-1" />
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </div>
          </div>

          {/* Search Bar - Below Filters */}
          <div className="mt-4 pt-4 border-t">
            <Input
              placeholder="Search by any field (title, location, department, etc.)..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              disabled={isLoading}
              className="w-full"
            />
          </div>
        </Card>
      </div>

      {/* Mobile Filter Sheet */}
      <div className="md:hidden">
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn('', hasActiveFilters && 'ring-2 ring-blue-500')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-96 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="space-y-6 mt-6">
                {/* Date Range */}
                <div>
                  <label className="text-sm font-medium">Date Range</label>
                  <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onDateRangeChange={onDateRangeChange}
                    className="mt-2"
                  />
                </div>

                {/* Crew Roles */}
                <div>
                  <MultiSelect
                    options={crewRoles}
                    selected={selectedRoles}
                    onChange={onRolesChange}
                    placeholder="Select crew roles..."
                    label="Crew Roles"
                    searchable={true}
                    isLoading={isLoading}
                  />
                </div>

                {/* Crew Members */}
                <div>
                  <MultiSelect
                    options={crewMembers}
                    selected={selectedMembers}
                    onChange={onMembersChange}
                    placeholder="Select crew members..."
                    label="Crew Members"
                    searchable={true}
                    isLoading={isLoading}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={onClearAll}
                    disabled={!hasActiveFilters || isLoading}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                  <Button
                    onClick={onExport}
                    disabled={isExporting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    {isExporting ? 'Exporting...' : 'Export'}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {startDate && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              From: {startDate.toLocaleDateString()}
            </span>
          )}
          {endDate && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              To: {endDate.toLocaleDateString()}
            </span>
          )}
          {selectedRoles.map(role => (
            <span key={role} className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
              Role: {role}
            </span>
          ))}
          {selectedMembers.map(member => (
            <span key={member} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
              {member}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
