import React, { useRef, useState, useCallback, useEffect } from 'react';

interface InputDragProps {
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

interface DragModifiers {
  shiftKey?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}

const MODIFIER_MULTIPLIERS = {
  shiftKey: 0.1,
  altKey: 10,
  ctrlKey: 0.01,
  metaKey: 0.01,
};

export default function InputDrag({
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
}: InputDragProps) {
  const isColor = type === 'color';
  const isNumber = type === 'number';
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);
  const [initialValue, setInitialValue] = useState(0);
  const [modifiers, setModifiers] = useState<DragModifiers>({});

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  const handleBlur = useCallback(() => {
    if (onBlur) {
      onBlur();
    }
  }, [onBlur]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onEnter) {
      e.preventDefault();
      onEnter();
    }
  }, [onEnter]);

  // Helper function to clamp values within bounds
  const clampValue = useCallback((val: number): number => {
    let clamped = val;
    if (min !== undefined) clamped = Math.max(min, clamped);
    if (max !== undefined) clamped = Math.min(max, clamped);
    return clamped;
  }, [min, max]);

  // Calculate drag multiplier based on modifiers
  const getDragMultiplier = useCallback((currentModifiers: DragModifiers): number => {
    if (currentModifiers.shiftKey) return MODIFIER_MULTIPLIERS.shiftKey;
    if (currentModifiers.altKey) return MODIFIER_MULTIPLIERS.altKey;
    if (currentModifiers.ctrlKey) return MODIFIER_MULTIPLIERS.ctrlKey;
    if (currentModifiers.metaKey) return MODIFIER_MULTIPLIERS.metaKey;
    return 1;
  }, []);

  // Format number based on step value
  const formatNumber = useCallback((num: number): number => {
    if (step >= 1) {
      // Integer fields - always round to whole numbers
      return Math.round(num);
    } else if (step < 1) {
      // Decimal fields - format to appropriate decimal places
      const decimalPlaces = Math.max(0, Math.ceil(-Math.log10(step)));
      return parseFloat(num.toFixed(decimalPlaces));
    }
    return num;
  }, [step]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isNumber || disabled) return;
    
    e.preventDefault();
    
    // Get current input value
    const currentInputValue = inputRef.current?.value || String(value);
    const numericValue = parseFloat(currentInputValue) || 0;
    
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartY(e.clientY);
    setInitialValue(numericValue);
    
    // Track modifier keys
    setModifiers({
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
    });
    
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, [isNumber, disabled, value]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;
    
    // Use Pythagorean theorem to calculate distance, with X having more weight
    const distance = Math.sign(deltaX) * Math.sqrt(deltaX * deltaX + deltaY * deltaY * 0.1);
    
    // Calculate drag multiplier based on step and modifiers
    let dragMultiplier = step;
    if (step >= 1) {
      dragMultiplier = Math.max(0.5, step / 10);
    } else if (step < 1) {
      dragMultiplier = step;
    }
    
    // Apply modifier key multiplier
    const modifierMultiplier = getDragMultiplier(modifiers);
    const totalMultiplier = dragMultiplier * modifierMultiplier;
    
    const deltaValue = distance * totalMultiplier * 0.1;
    const newValue = clampValue(initialValue + deltaValue);
    const formattedValue = formatNumber(newValue);
    
    onChange(String(formattedValue));
  }, [isDragging, dragStartX, dragStartY, initialValue, modifiers, step, getDragMultiplier, clampValue, formatNumber, onChange]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      // Trigger blur event to save the value
      if (onBlur) {
        onBlur();
      }
    }
  }, [isDragging, onBlur]);

  // Handle click without drag (focus input)
  const handleClick = useCallback(() => {
    if (!isDragging && isNumber && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isDragging, isNumber]);

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Track modifier keys during drag
  useEffect(() => {
    if (isDragging) {
      const handleKeyDown = (e: KeyboardEvent) => {
        setModifiers({
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
        });
      };
      
      const handleKeyUp = (e: KeyboardEvent) => {
        setModifiers({
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
        });
      };
      
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keyup', handleKeyUp);
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
      };
    }
  }, [isDragging]);

  return (
    <div className={`space-y-2 ${className} ${isNumber ? 'no-spinners' : ''}`}>
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
              ref={inputRef}
              type={type}
              value={String(value)}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onMouseDown={isNumber ? handleMouseDown : undefined}
              onClick={isNumber ? handleClick : undefined}
              disabled={disabled}
              placeholder={placeholder}
              min={min}
              max={max}
              step={step}
              className={`w-full px-4 py-3 text-sm font-medium border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:border-gray-300 dark:hover:border-gray-500 ${
                unit ? 'pr-12' : ''
              } ${isNumber ? (isDragging ? 'cursor-ew-resize' : 'cursor-ew-resize') : ''}`}
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
      
      {/* Drag hint for number inputs */}
      {isNumber && !disabled && (
        <div className="text-xs text-gray-400 dark:text-gray-500">
          Drag to adjust • Hold Shift for fine control • Hold Alt for fast control
        </div>
      )}
    </div>
  );
}