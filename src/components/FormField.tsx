import React from 'react';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'datetime-local' | 'textarea';
  value: string;
  onChange: (name: string, value: string) => void;
  options?: string[];
  required?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  options,
  required = false
}) => {
  const baseInputClass = "w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all";

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {options ? (
        <select
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          className={baseInputClass}
        >
          <option value="">Select {label}</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          rows={4}
          className={baseInputClass}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          className={baseInputClass}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      )}
    </div>
  );
};
