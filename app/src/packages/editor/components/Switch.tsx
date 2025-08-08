import React from 'react';

interface SwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  onBlur?: () => void;
  className?: string;
  disabled?: boolean;
  description?: string;
}

export default function Switch({
  label,
  checked,
  onChange,
  onBlur,
  className = '',
  disabled = false,
  description
}: SwitchProps) {
  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleToggle();
    }
  };

  const handleBlur = () => {
    if (onBlur) {
      onBlur();
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
        {label}
      </label>
      
      {/* Switch Container */}
      <div className="flex items-center space-x-3">
        {/* Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={handleToggle}
          onKeyDown={handleKeyPress}
          onBlur={handleBlur}
          disabled={disabled}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed
            ${checked 
              ? 'bg-blue-600 hover:bg-blue-700' 
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }
          `}
        >
          <span className="sr-only">{label}</span>
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out
              ${checked ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
        
        {/* Status Text */}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none">
          {checked ? 'On' : 'Off'}
        </span>
      </div>
      
      {/* Description */}
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {description}
        </p>
      )}
    </div>
  );
}