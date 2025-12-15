import React from 'react';
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
}

export const PriceStepperInput: React.FC<PriceStepperInputProps> = ({
  label,
  value,
  onChange,
  step = 0.01,
  min = 0,
  max,
  suffix,
  disabled = false,
  className,
}) => {
  const numValue = parseFloat(value) || 0;

  const handleDecrement = () => {
    const newValue = Math.max(min, numValue - step);
    onChange(newValue.toFixed(8).replace(/\.?0+$/, ''));
  };

  const handleIncrement = () => {
    const newValue = max !== undefined ? Math.min(max, numValue + step) : numValue + step;
    onChange(newValue.toFixed(8).replace(/\.?0+$/, ''));
  };

  return (
    <div className={cn("relative", className)}>
      <div className="bg-card border border-border rounded-lg px-3 py-2 relative z-0">
        <label className="block text-xs text-muted-foreground mb-1">{label}</label>
        <div className="flex items-center">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="flex-1 bg-transparent text-foreground font-mono text-base py-1 outline-none min-w-0"
          />
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={disabled || numValue <= min}
              className="w-8 h-8 flex items-center justify-center bg-muted rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-50"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleIncrement}
              disabled={disabled || (max !== undefined && numValue >= max)}
              className="w-8 h-8 flex items-center justify-center bg-muted rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};