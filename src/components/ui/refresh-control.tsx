import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RefreshControlProps {
  onRefresh: () => Promise<void>;
  refreshing?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function RefreshControl({
  onRefresh,
  refreshing: externalRefreshing,
  children,
  className
}: RefreshControlProps) {
  const [refreshing, setRefreshing] = React.useState(false);
  const [pullDistance, setPullDistance] = React.useState(0);
  const [startY, setStartY] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const isRefreshing = externalRefreshing ?? refreshing;
  const threshold = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === 0 || containerRef.current!.scrollTop > 0) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY);
    
    if (distance > 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance * 0.5, threshold + 20));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > threshold && !isRefreshing) {
      setRefreshing(true);
      setPullDistance(threshold);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
    setStartY(0);
  };

  const refreshOpacity = Math.min(pullDistance / threshold, 1);
  const showRefreshIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ overscrollBehavior: 'none' }}
    >
      {/* Pull-to-refresh indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 z-50"
        style={{
          height: pullDistance,
          opacity: showRefreshIndicator ? refreshOpacity : 0,
          transform: isRefreshing ? 'translateY(0)' : `translateY(${-20 + pullDistance}px)`
        }}
      >
        <div className="bg-background/80 backdrop-blur-sm rounded-full p-2 shadow-lg">
          <Loader2 
            className={cn(
              "w-5 h-5 text-primary",
              isRefreshing && "animate-spin"
            )} 
          />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: isRefreshing ? `translateY(${threshold}px)` : `translateY(${pullDistance}px)`,
          transition: isRefreshing || pullDistance === 0 ? 'transform 0.2s ease-out' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
}
