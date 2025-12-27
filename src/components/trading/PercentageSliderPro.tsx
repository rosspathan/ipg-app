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
    <div className={cn("py-2", className)}>
      <div className="relative h-5 flex items-center">
        {/* Track background */}
        <div className="absolute left-0 right-0 h-px bg-muted" />
        
        {/* Active track - gold/amber color */}
        <div 
          className="absolute left-0 h-px bg-amber-500"
          style={{ width: `${value}%` }}
        />
        
        {/* Diamond Markers */}
        {markers.map((marker, index) => {
          const isActive = marker <= value || index === 0;
          return (
            <button
              key={marker}
              type="button"
              disabled={disabled}
              onClick={() => onChange(marker)}
              className={cn(
                "absolute w-2 h-2 rotate-45 -translate-x-1/2",
                index === 0 
                  ? "bg-amber-500 border-0"
                  : marker <= value
                    ? "bg-amber-500 border-0"
                    : "bg-transparent border border-muted-foreground/40",
                !disabled && "hover:scale-110 cursor-pointer"
              )}
              style={{ left: `${marker}%` }}
            />
          );
        })}
      </div>
      
      {/* Labels */}
      <div className="relative flex justify-between mt-1">
        {markers.map((marker) => (
          <span 
            key={marker} 
            className="text-[10px] text-muted-foreground"
          >
            {marker}%
          </span>
        ))}
      </div>
    </div>
  );
};