import { CleanCard } from "./CleanCard";
import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <CleanCard padding="lg" className={className}>
      <div className="animate-pulse space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-20 bg-[hsl(220_13%_14%)] rounded" />
          <div className="h-6 w-6 bg-[hsl(220_13%_14%)] rounded-lg" />
        </div>
        <div className="h-8 w-24 bg-[hsl(220_13%_14%)] rounded" />
        <div className="h-3 w-16 bg-[hsl(220_13%_14%)] rounded-full" />
      </div>
    </CleanCard>
  );
}

export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse flex items-center gap-3 py-3", className)}>
      <div className="h-10 w-10 bg-[hsl(220_13%_14%)] rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 bg-[hsl(220_13%_14%)] rounded" />
        <div className="h-3 w-1/2 bg-[hsl(220_13%_14%)] rounded" />
      </div>
    </div>
  );
}
