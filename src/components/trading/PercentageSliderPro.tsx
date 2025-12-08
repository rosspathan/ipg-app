import React from 'react';
import { cn } from '@/lib/utils';

interface PercentageSliderProProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

const markers = [0, 25, 50, 75, 100];

export const PercentageSliderPro: React.FC<PercentageSliderProProps> = ({
  value,
  onChange,
  disabled = false,
  className,
}) => {
  return (
    <div className={cn("py-4", className)}>
      <div className="relative h-8 flex items-center">
        {/* Track background */}
        <div className="absolute left-0 right-0 h-0.5 bg-border rounded-full" />
        
        {/* Active track */}
        <div 
          className="absolute left-0 h-0.5 bg-primary rounded-full"
          style={{ width: `${value}%` }}
        />
        
        {/* Markers */}
        {markers.map((marker) => (
          <button
            key={marker}
            type="button"
            disabled={disabled}
            onClick={() => onChange(marker)}
            className={cn(
              "absolute w-3 h-3 rotate-45 border-2 -translate-x-1/2",
              marker <= value
                ? "bg-primary border-primary"
                : "bg-card border-border",
              !disabled && "hover:scale-125 cursor-pointer"
            )}
            style={{ left: `${marker}%` }}
          />
        ))}
      </div>
      
      {/* Labels */}
      <div className="relative flex justify-between mt-1">
        {markers.map((marker) => (
          <span 
            key={marker} 
            className={cn(
              "text-xs",
              marker <= value ? "text-primary" : "text-muted-foreground"
            )}
          >
            {marker}%
          </span>
        ))}
      </div>
    </div>
  );
};
