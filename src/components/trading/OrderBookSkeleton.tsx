import React from 'react';
import { cn } from '@/lib/utils';

interface OrderBookSkeletonProps {
  rows?: number;
}

export const OrderBookSkeleton: React.FC<OrderBookSkeletonProps> = ({ rows = 8 }) => {
  return (
    <div className="space-y-0.5">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between px-2 py-1"
        >
          <div 
            className={cn(
              "h-3 rounded bg-muted animate-pulse",
              idx % 2 === 0 ? "w-20" : "w-16"
            )}
            style={{ animationDelay: `${idx * 50}ms` }}
          />
          <div 
            className="h-3 w-12 rounded bg-muted animate-pulse"
            style={{ animationDelay: `${idx * 50 + 25}ms` }}
          />
        </div>
      ))}
    </div>
  );
};
