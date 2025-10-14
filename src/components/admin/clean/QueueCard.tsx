import { LucideIcon } from "lucide-react";
import { CleanCard } from "./CleanCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QueueCardProps {
  title: string;
  count: number;
  icon: LucideIcon;
  priority?: "default" | "warning" | "danger";
  onAction: () => void;
  actionLabel?: string;
  className?: string;
}

export function QueueCard({
  title,
  count,
  icon: Icon,
  priority = "default",
  onAction,
  actionLabel = "Review",
  className,
}: QueueCardProps) {
  const borderColors = {
    default: "border-l-[hsl(262_100%_65%)]",
    warning: "border-l-[hsl(33_93%_60%)]",
    danger: "border-l-[hsl(0_84%_60%)]",
  };

  const iconBgColors = {
    default: "bg-[hsl(262_100%_65%/0.1)]",
    warning: "bg-[hsl(33_93%_60%/0.1)]",
    danger: "bg-[hsl(0_84%_60%/0.1)]",
  };

  const iconColors = {
    default: "text-[hsl(262_100%_65%)]",
    warning: "text-[hsl(33_93%_60%)]",
    danger: "text-[hsl(0_84%_60%)]",
  };

  return (
    <CleanCard 
      padding="lg" 
      className={cn(
        "border-l-4 hover:bg-[hsl(220_13%_12%)] transition-all",
        borderColors[priority],
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={cn("p-2 rounded-lg shrink-0", iconBgColors[priority])}>
            <Icon className={cn("w-5 h-5", iconColors[priority])} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-[hsl(0_0%_98%)] mb-1">
              {title}
            </h3>
            <p className="text-2xl font-bold text-[hsl(0_0%_98%)]" style={{ fontFeatureSettings: "'tnum'" }}>
              {count}
            </p>
          </div>
        </div>
        <Button
          onClick={onAction}
          size="sm"
          className="shrink-0 bg-[hsl(262_100%_65%)] hover:bg-[hsl(262_100%_70%)] text-white h-9"
        >
          {actionLabel}
        </Button>
      </div>
    </CleanCard>
  );
}
