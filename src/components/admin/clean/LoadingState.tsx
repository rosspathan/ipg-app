import { Loader2 } from "lucide-react";
import { CleanCard } from "./CleanCard";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = "Loading...", className }: LoadingStateProps) {
  return (
    <CleanCard padding="lg" className={className}>
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className="w-8 h-8 text-[hsl(262_100%_65%)] animate-spin mb-3" />
        <p className="text-sm text-[hsl(220_9%_65%)]">{message}</p>
      </div>
    </CleanCard>
  );
}

export function LoadingSpinner({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <Loader2 className={cn("text-[hsl(262_100%_65%)] animate-spin", sizeClasses[size], className)} />
  );
}
