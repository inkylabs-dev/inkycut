import React from 'react';

interface InputProps {
  label: string;
  value: string | number;
  type?: 'text' | 'number' | 'color';
  placeholder?: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
  disabled?: boolean;
}

export default function Input({
  label,
  value,
  type = 'text',
  placeholder,
  unit,
  min,
  max,
  step = 1,
  onChange,
  onBlur,
  className = '',
  disabled = false
}: InputProps) {
  const isColor = type === 'color';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = () => {
    if (onBlur) {
      onBlur();
    }
  };

  return (
    <div className={`flex flex-col space-y-1 ${className}`}>
      {/* Label */}
      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
        {label}:
      </label>
      
      {/* Input Container */}
      <div className="relative flex items-center">
        {isColor ? (
          // Color input with text input
          <div className="flex items-center space-x-2 w-full">
            <input
              type="color"
              value={String(value) || '#000000'}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={disabled}
              className="w-8 h-6 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
              title="Pick a color"
            />
            <input
              type="text"
              value={String(value)}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={disabled}
              placeholder={placeholder}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        ) : (
          // Regular input
          <div className="flex items-center w-full">
            <input
              type={type}
              value={String(value)}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={disabled}
              placeholder={placeholder}
              min={min}
              max={max}
              step={step}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {unit && (
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                {unit}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}