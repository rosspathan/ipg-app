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
    <div className={cn("py-1.5", className)}>
      <div className="relative h-6 flex items-center">
        {/* Track background */}
        <div className="absolute left-0 right-0 h-px bg-muted" />
        
        {/* Active track - gold/amber color */}
        <div 
          className="absolute left-0 h-px bg-amber-500"
          style={{ width: `${value}%` }}
        />
        
        {/* Diamond Markers with larger tap targets */}
        {markers.map((marker, index) => {
          const isActive = marker <= value || index === 0;
          return (
            <button
              key={marker}
              type="button"
              disabled={disabled}
              onClick={() => onChange(marker)}
              className={cn(
                "absolute w-6 h-6 -translate-x-1/2 flex items-center justify-center",
                !disabled && "cursor-pointer"
              )}
              style={{ left: `${marker}%` }}
            >
              <span
                className={cn(
                  "w-2 h-2 rotate-45 transition-transform",
                  index === 0 
                    ? "bg-amber-500"
                    : isActive
                      ? "bg-amber-500"
                      : "bg-transparent border border-muted-foreground/40",
                  !disabled && "hover:scale-125"
                )}
              />
            </button>
          );
        })}
      </div>
      
      {/* Labels - positioned precisely under each marker */}
      <div className="relative h-3">
        {markers.map((marker) => (
          <span 
            key={marker} 
            className="absolute text-[10px] text-muted-foreground -translate-x-1/2"
            style={{ left: `${marker}%` }}
          >
            {marker}%
          </span>
        ))}
      </div>
    </div>
  );
};