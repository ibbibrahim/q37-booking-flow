import React from 'react';
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
import type { EditingSearchRequest } from '../types/editing';

interface EditingSearchFiltersProps {
  filters: EditingSearchRequest;
  onFiltersChange: (filters: EditingSearchRequest) => void;
  onSearch: () => void;
  onClear: () => void;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Acknowledged', label: 'Acknowledged' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

export const EditingSearchFilters: React.FC<EditingSearchFiltersProps> = ({
  filters,
  onFiltersChange,
  onSearch,
  onClear,
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
      <div className="space-y-2 flex-1 min-w-[200px]">
        <Label htmlFor="searchQuery">Search</Label>
        <Input
          id="searchQuery"
          placeholder="Program name, producer..."
          value={filters.searchQuery || ''}
          onChange={(e) =>
            onFiltersChange({ ...filters, searchQuery: e.target.value || undefined })
          }
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
        />
      </div>
      <div className="space-y-2 w-full sm:w-[180px]">
        <Label htmlFor="status">Status</Label>
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, status: value === 'all' ? undefined : value })
          }
        >
          <SelectTrigger id="status">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 w-full sm:w-[160px]">
        <Label htmlFor="dateFrom">From Date</Label>
        <Input
          id="dateFrom"
          type="date"
          value={
            filters.dateFrom
              ? new Date(filters.dateFrom).toISOString().slice(0, 10)
              : ''
          }
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              dateFrom: e.target.value ? new Date(e.target.value) : undefined,
            })
          }
        />
      </div>
      <div className="space-y-2 w-full sm:w-[160px]">
        <Label htmlFor="dateTo">To Date</Label>
        <Input
          id="dateTo"
          type="date"
          value={
            filters.dateTo ? new Date(filters.dateTo).toISOString().slice(0, 10) : ''
          }
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              dateTo: e.target.value ? new Date(e.target.value) : undefined,
            })
          }
        />
      </div>
      <div className="flex items-end gap-2">
        <Button onClick={onSearch}>Search</Button>
        <Button variant="outline" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
};
