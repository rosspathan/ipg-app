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
        <div className="absolute left-0 right-0 h-0.5 bg-[#3a3a50]" />
        
        {/* Active track - gold/amber color */}
        <div 
          className="absolute left-0 h-0.5 bg-amber-500"
          style={{ width: `${value}%` }}
        />
        
        {/* Diamond Markers */}
        {markers.map((marker, index) => {
          // First marker (0%) is always filled gold as per screenshot
          const isActive = marker <= value || index === 0;
          return (
            <button
              key={marker}
              type="button"
              disabled={disabled}
              onClick={() => onChange(marker)}
              className={cn(
                "absolute w-3 h-3 rotate-45 -translate-x-1/2",
                index === 0 
                  ? "bg-amber-500 border-0" // First diamond always gold filled
                  : marker <= value
                    ? "bg-amber-500 border-0"
                    : "bg-transparent border-2 border-[#4a4a60]",
                !disabled && "hover:scale-110 cursor-pointer"
              )}
              style={{ left: `${marker}%` }}
            />
          );
        })}
      </div>
      
      {/* Labels */}
      <div className="relative flex justify-between mt-2">
        {markers.map((marker, index) => (
          <span 
            key={marker} 
            className={cn(
              "text-xs",
              index === 0 || marker <= value ? "text-muted-foreground" : "text-muted-foreground"
            )}
          >
            {marker}%
          </span>
        ))}
      </div>
    </div>
  );
};
