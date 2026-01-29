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
  const [isPulling, setIsPulling] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const isRefreshing = externalRefreshing ?? refreshing;
  const threshold = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only start pull-to-refresh if at top of scroll
    const scrollContainer = containerRef.current?.closest('.app-main') || containerRef.current;
    if (scrollContainer && scrollContainer.scrollTop <= 0) {
      setStartY(e.touches[0].clientY);
      setIsPulling(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === 0) return;
    
    // Check if we're at the top of the scroll container
    const scrollContainer = containerRef.current?.closest('.app-main') || containerRef.current;
    if (scrollContainer && scrollContainer.scrollTop > 0) {
      // User is scrolling content, reset pull state
      setStartY(0);
      setPullDistance(0);
      setIsPulling(false);
      return;
    }

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;
    
    // Only activate pull-to-refresh on downward pull
    if (distance > 10) {
      setIsPulling(true);
      setPullDistance(Math.min(distance * 0.5, threshold + 20));
    } else if (distance < -10) {
      // User is scrolling up, don't interfere
      setStartY(0);
      setIsPulling(false);
    }
  };

  const handleTouchEnd = async () => {
    if (isPulling && pullDistance > threshold && !isRefreshing) {
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
    setIsPulling(false);
  };

  const refreshOpacity = Math.min(pullDistance / threshold, 1);
  const showRefreshIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {showRefreshIndicator && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 z-50 pointer-events-none"
          style={{
            height: pullDistance,
            opacity: refreshOpacity,
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
      )}

      {/* Content */}
      <div
        style={{
          transform: isRefreshing ? `translateY(${threshold}px)` : (isPulling ? `translateY(${pullDistance}px)` : 'none'),
          transition: isRefreshing || pullDistance === 0 ? 'transform 0.2s ease-out' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
}
