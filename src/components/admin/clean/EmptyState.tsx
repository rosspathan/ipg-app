import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CleanCard } from "./CleanCard";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <CleanCard padding="lg" className={className}>
      <div className="flex flex-col items-center justify-center text-center py-8">
        <div className="p-4 rounded-full bg-[hsl(220_13%_10%)] mb-4">
          <Icon className="w-8 h-8 text-[hsl(220_9%_46%)]" />
        </div>
        <h3 className="text-base font-semibold text-[hsl(0_0%_98%)] mb-2">
          {title}
        </h3>
        <p className="text-sm text-[hsl(220_9%_65%)] mb-4 max-w-sm">
          {description}
        </p>
        {actionLabel && onAction && (
          <Button
            onClick={onAction}
            className="bg-[hsl(262_100%_65%)] hover:bg-[hsl(262_100%_70%)] text-white"
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </CleanCard>
  );
}
