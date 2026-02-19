import React, { useRef, useCallback, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  label: string;
  value: number;
  color?: 'green' | 'red';
}

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
  quickAction?: QuickAction;
}

const getSmartStep = (value: number): number => {
  if (value >= 10000) return 10;
  if (value >= 1000) return 1;
  if (value >= 100) return 0.1;
  if (value >= 10) return 0.01;
  if (value >= 1) return 0.001;
  if (value >= 0.1) return 0.0001;
  return 0.00001;
};

const formatNumber = (num: number, maxDecimals: number = 8): string => {
  const fixed = num.toFixed(maxDecimals);
  return fixed.replace(/\.?0+$/, '') || '0';
};

export const PriceStepperInput: React.FC<PriceStepperInputProps> = ({
  label, value, onChange, step, min = 0, max, suffix, disabled = false, className, decimals = 8, quickAction,
}) => {
  const numValue = parseFloat(value) || 0;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const effectiveStep = step ?? getSmartStep(numValue);

  const handleDecrement = useCallback(() => {
    const newValue = Math.max(min, numValue - effectiveStep);
    onChange(formatNumber(newValue, decimals));
  }, [numValue, effectiveStep, min, onChange, decimals]);

  const handleIncrement = useCallback(() => {
    const newValue = max !== undefined ? Math.min(max, numValue + effectiveStep) : numValue + effectiveStep;
    onChange(formatNumber(newValue, decimals));
  }, [numValue, effectiveStep, max, onChange, decimals]);

  const startLongPress = useCallback((action: () => void) => {
    action();
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(action, 75);
    }, 400);
  }, []);

  const stopLongPress = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  useEffect(() => { return () => { stopLongPress(); }; }, [stopLongPress]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); handleIncrement(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); handleDecrement(); }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="bg-card border border-border/80 rounded-md px-2.5 py-1.5">
        <div className="flex items-center justify-between mb-0.5">
          <label className="text-[10px] text-muted-foreground">{label}</label>
          {quickAction && quickAction.value > 0 && (
            <button
              type="button"
              onClick={() => onChange(formatNumber(quickAction.value, decimals))}
              className={cn(
                "text-[9px] font-semibold px-1.5 py-0.5 rounded transition-colors",
                quickAction.color === 'red'
                  ? "bg-danger/10 text-danger active:bg-danger/20"
                  : "bg-success/10 text-success active:bg-success/20"
              )}
            >
              {quickAction.label}
            </button>
          )}
        </div>
        <div className="flex items-center">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="flex-1 bg-transparent text-foreground font-mono text-sm py-0.5 outline-none min-w-0 overflow-x-auto text-ellipsis"
          />
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onMouseDown={() => startLongPress(handleDecrement)}
              onMouseUp={stopLongPress}
              onMouseLeave={stopLongPress}
              onTouchStart={() => startLongPress(handleDecrement)}
              onTouchEnd={stopLongPress}
              disabled={disabled || numValue <= min}
              className="w-6 h-6 flex items-center justify-center border border-border rounded text-muted-foreground active:text-foreground active:border-foreground/50 disabled:opacity-30 select-none touch-manipulation"
            >
              <Minus className="h-3 w-3" />
            </button>
            <button
              type="button"
              onMouseDown={() => startLongPress(handleIncrement)}
              onMouseUp={stopLongPress}
              onMouseLeave={stopLongPress}
              onTouchStart={() => startLongPress(handleIncrement)}
              onTouchEnd={stopLongPress}
              disabled={disabled || (max !== undefined && numValue >= max)}
              className="w-6 h-6 flex items-center justify-center border border-border rounded text-muted-foreground active:text-foreground active:border-foreground/50 disabled:opacity-30 select-none touch-manipulation"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
