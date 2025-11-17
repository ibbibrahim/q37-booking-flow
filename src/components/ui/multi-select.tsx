import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Search } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { Badge } from './badge';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Checkbox } from './checkbox';
import { ScrollArea } from './scroll-area';
import { cn } from '@/lib/utils';

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  label?: string;
  searchable?: boolean;
  className?: string;
  isLoading?: boolean;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selected,
  onChange,
  placeholder = 'Select items...',
  label,
  searchable = true,
  className,
  isLoading = false,
  disabled = false,
  onOpenChange,
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open, searchable]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
    if (!newOpen) {
      setSearchQuery('');
    }
  };

  const filteredOptions = searchQuery
    ? options.filter(option =>
        option.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const handleSelect = (option: string) => {
    const newSelected = selected.includes(option)
      ? selected.filter(item => item !== option)
      : [...selected, option];
    onChange(newSelected);
  };

  const handleRemove = (option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter(item => item !== option));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && <label className="text-sm font-medium">{label}</label>}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn(
              'w-full justify-between',
              !selected.length && 'text-muted-foreground',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            disabled={disabled || isLoading}
          >
            <div className="flex flex-wrap gap-1 flex-1 text-left">
              {selected.length > 0 ? (
                <>
                  {selected.slice(0, 2).map(item => (
                    <Badge key={item} variant="secondary" className="text-xs">
                      {item}
                    </Badge>
                  ))}
                  {selected.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{selected.length - 2}
                    </Badge>
                  )}
                </>
              ) : (
                <span>{placeholder}</span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <div className="flex flex-col gap-0 max-h-96">
            {searchable && (
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8"
                  />
                </div>
              </div>
            )}

            <ScrollArea className="h-auto max-h-64">
              <div className="p-2">
                {isLoading ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    Loading...
                  </div>
                ) : filteredOptions.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No items found
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {filteredOptions.map(option => (
                      <div key={option} className="flex items-center gap-2">
                        <Checkbox
                          id={option}
                          checked={selected.includes(option)}
                          onCheckedChange={() => handleSelect(option)}
                        />
                        <label
                          htmlFor={option}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>

            {selected.length > 0 && (
              <div className="border-t p-2 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  className="flex-1"
                >
                  Clear All
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map(item => (
            <Badge key={item} variant="secondary" className="text-xs pr-1">
              {item}
              <button
                onClick={(e) => handleRemove(item, e)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
