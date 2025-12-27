import React, { useRef, useCallback, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriceStepperInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  disabled?: boolean;
  className?: string;
  decimals?: number;
}

// Smart step calculation based on value magnitude (like Binance/KuCoin)
const getSmartStep = (value: number): number => {
  if (value >= 10000) return 10;
  if (value >= 1000) return 1;
  if (value >= 100) return 0.1;
  if (value >= 10) return 0.01;
  if (value >= 1) return 0.001;
  if (value >= 0.1) return 0.0001;
  return 0.00001;
};

// Clean number formatting - remove trailing zeros
const formatNumber = (num: number, maxDecimals: number = 8): string => {
  const fixed = num.toFixed(maxDecimals);
  // Remove trailing zeros but keep at least one decimal place for prices
  return fixed.replace(/\.?0+$/, '') || '0';
};

export const PriceStepperInput: React.FC<PriceStepperInputProps> = ({
  label,
  value,
  onChange,
  step,
  min = 0,
  max,
  suffix,
  disabled = false,
  className,
  decimals = 8,
}) => {
  const numValue = parseFloat(value) || 0;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use provided step or calculate smart step
  const effectiveStep = step ?? getSmartStep(numValue);

  const handleDecrement = useCallback(() => {
    const newValue = Math.max(min, numValue - effectiveStep);
    onChange(formatNumber(newValue, decimals));
  }, [numValue, effectiveStep, min, onChange, decimals]);

  const handleIncrement = useCallback(() => {
    const newValue = max !== undefined ? Math.min(max, numValue + effectiveStep) : numValue + effectiveStep;
    onChange(formatNumber(newValue, decimals));
  }, [numValue, effectiveStep, max, onChange, decimals]);

  // Long-press support for continuous increment/decrement
  const startLongPress = useCallback((action: () => void) => {
    action(); // Immediate first action
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(action, 75); // Fast repeat after delay
    }, 400); // Initial delay before repeat
  }, []);

  const stopLongPress = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLongPress();
    };
  }, [stopLongPress]);

  // Keyboard support
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleIncrement();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleDecrement();
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="bg-card border border-border rounded-lg px-3 py-2 relative z-0">
        <label className="block text-xs text-muted-foreground mb-0.5">{label}</label>
        <div className="flex items-center">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="flex-1 bg-transparent text-foreground font-mono text-sm py-0.5 outline-none min-w-0"
          />
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onMouseDown={() => startLongPress(handleDecrement)}
              onMouseUp={stopLongPress}
              onMouseLeave={stopLongPress}
              onTouchStart={() => startLongPress(handleDecrement)}
              onTouchEnd={stopLongPress}
              disabled={disabled || numValue <= min}
              className="w-7 h-7 min-h-0 min-w-0 flex items-center justify-center border border-border rounded-full text-muted-foreground hover:text-foreground hover:border-muted-foreground active:scale-95 disabled:opacity-50 select-none touch-manipulation"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onMouseDown={() => startLongPress(handleIncrement)}
              onMouseUp={stopLongPress}
              onMouseLeave={stopLongPress}
              onTouchStart={() => startLongPress(handleIncrement)}
              onTouchEnd={stopLongPress}
              disabled={disabled || (max !== undefined && numValue >= max)}
              className="w-7 h-7 min-h-0 min-w-0 flex items-center justify-center border border-border rounded-full text-muted-foreground hover:text-foreground hover:border-muted-foreground active:scale-95 disabled:opacity-50 select-none touch-manipulation"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};