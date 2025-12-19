import { cn } from "@/lib/utils";

interface SkeletonLoaderProps {
  className?: string;
  variant?: 'text' | 'circle' | 'card' | 'button';
  lines?: number;
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        "animate-pulse bg-muted rounded",
        className
      )} 
    />
  );
}

export function SkeletonLoader({ 
  className, 
  variant = 'text',
  lines = 1 
}: SkeletonLoaderProps) {
  if (variant === 'circle') {
    return <Skeleton className={cn("w-12 h-12 rounded-full", className)} />;
  }

  if (variant === 'button') {
    return <Skeleton className={cn("h-10 w-24 rounded-md", className)} />;
  }

  if (variant === 'card') {
    return (
      <div className={cn("space-y-3 p-4 rounded-lg bg-card", className)}>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={cn(
            "h-4",
            i === lines - 1 && lines > 1 ? "w-2/3" : "w-full"
          )} 
        />
      ))}
    </div>
  );
}

export function BalanceCardSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-card border border-border space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  );
}

export function AssetListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <BalanceCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TransactionSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-card">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="text-right space-y-2">
        <Skeleton className="h-4 w-16 ml-auto" />
        <Skeleton className="h-3 w-12 ml-auto" />
      </div>
    </div>
  );
}

export function OrderBookSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
