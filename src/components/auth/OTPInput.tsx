import React, { useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  value,
  onChange,
  length = 6,
  disabled = false,
  error = false,
  autoFocus = true,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const values = value.split('').slice(0, length);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const focusInput = (index: number) => {
    if (inputRefs.current[index]) {
      inputRefs.current[index]?.focus();
    }
  };

  const handleChange = (index: number, digit: string) => {
    if (disabled) return;

    // Only allow single digits
    const cleanDigit = digit.replace(/\D/g, '').slice(0, 1);
    
    const newValues = [...values];
    while (newValues.length < length) {
      newValues.push('');
    }
    newValues[index] = cleanDigit;
    
    const newValue = newValues.join('');
    onChange(newValue);

    // Auto-focus next input
    if (cleanDigit && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    // Backspace: clear current or move to previous
    if (e.key === 'Backspace') {
      e.preventDefault();
      
      if (values[index]) {
        // Clear current
        const newValues = [...values];
        newValues[index] = '';
        onChange(newValues.join(''));
      } else if (index > 0) {
        // Move to previous and clear
        const newValues = [...values];
        newValues[index - 1] = '';
        onChange(newValues.join(''));
        focusInput(index - 1);
      }
    }
    
    // Arrow keys navigation
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      focusInput(index - 1);
    }
    
    if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      focusInput(index + 1);
    }

    // Delete: clear current and stay
    if (e.key === 'Delete') {
      e.preventDefault();
      const newValues = [...values];
      newValues[index] = '';
      onChange(newValues.join(''));
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;

    const pastedData = e.clipboardData.getData('text/plain');
    const digits = pastedData.replace(/\D/g, '').slice(0, length);
    
    onChange(digits);
    
    // Focus the next empty input or last input
    const nextEmptyIndex = Math.min(digits.length, length - 1);
    focusInput(nextEmptyIndex);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: index * 0.05, duration: 0.2 }}
        >
          <input
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={values[index] || ''}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={handleFocus}
            disabled={disabled}
            className={cn(
              'w-12 h-14 text-center text-2xl font-bold rounded-lg',
              'bg-background border-2 transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              error
                ? 'border-destructive focus:ring-destructive'
                : values[index]
                ? 'border-primary focus:ring-primary'
                : 'border-input focus:ring-ring',
              disabled && 'opacity-50 cursor-not-allowed',
              'sm:w-14 sm:h-16 sm:text-3xl'
            )}
            aria-label={`Digit ${index + 1}`}
          />
        </motion.div>
      ))}
    </div>
  );
};
