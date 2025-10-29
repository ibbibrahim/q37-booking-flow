import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'datetime-local' | 'textarea';
  value: string;
  onChange: (name: string, value: string) => void;
  options?: string[];
  required?: boolean;
  placeholder?: string;
  error?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  options,
  required = false,
  placeholder,
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const baseInputClass = `w-full px-3 py-2.5 bg-card border rounded-lg focus:ring-2 outline-none transition-all text-card-foreground ${
    error
      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
      : 'border-border focus:ring-primary focus:border-transparent'
  }`;

  if (options) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-card-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`${baseInputClass} flex items-center justify-between cursor-pointer hover:border-primary/50`}
          >
            <span className={value ? 'text-card-foreground' : 'text-muted-foreground'}>
              {value || `Select ${label}`}
            </span>
            <ChevronDown
              size={18}
              className={`text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isOpen && (
            <div className="absolute z-50 w-full mt-2 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(name, option);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 text-left hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between ${
                    value === option ? 'bg-accent/10 text-primary font-medium' : 'text-popover-foreground'
                  }`}
                >
                  <span>{option}</span>
                  {value === option && (
                    <Check size={16} className="text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-card-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>

      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          rows={4}
          className={baseInputClass}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          className={baseInputClass}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
        />
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
};
