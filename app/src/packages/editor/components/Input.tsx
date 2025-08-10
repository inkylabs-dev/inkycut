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
  onEnter?: () => void;
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
  onEnter,
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
        {label}
      </label>
      
      {/* Input Container */}
      <div className="relative">
        {isColor ? (
          // Color input with text input
          <div className="flex items-center space-x-3">
            <div className="relative">
              <input
                type="color"
                value={String(value) || '#000000'}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                className="w-10 h-10 border-2 border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer shadow-sm hover:border-gray-300 dark:hover:border-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Pick a color"
              />
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                value={String(value)}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                placeholder={placeholder}
                className="w-full px-4 py-3 text-sm font-medium border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:border-gray-300 dark:hover:border-gray-500"
              />
            </div>
          </div>
        ) : (
          // Regular input
          <div className="relative">
            <input
              type={type}
              value={String(value)}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={placeholder}
              min={min}
              max={max}
              step={step}
              className={`w-full px-4 py-3 text-sm font-medium border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:border-gray-300 dark:hover:border-gray-500 ${
                unit ? 'pr-12' : ''
              }`}
            />
            {unit && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 select-none">
                  {unit}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}