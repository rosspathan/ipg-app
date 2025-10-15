import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning";
  trend?: {
    value: number;
    label: string;
  };
}

export function MobileStatCard({ 
  title, 
  value, 
  icon: Icon, 
  variant = "default",
  trend 
}: MobileStatCardProps) {
  const variantClasses = {
    default: "text-primary",
    success: "text-success",
    warning: "text-warning"
  };

  const variantBgClasses = {
    default: "bg-primary/10",
    success: "bg-success/10",
    warning: "bg-warning/10"
  };

  return (
    <div className="bg-card border border-border rounded-xl p-3 transition-all duration-200 hover:border-border/60">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
        <div className={cn("rounded-lg p-1.5", variantBgClasses[variant])}>
          <Icon className={cn("w-3.5 h-3.5", variantClasses[variant])} />
        </div>
      </div>
      <p className="text-lg md:text-xl font-bold mb-0.5 truncate" aria-label={`${title}: ${value}`}>
        {value}
      </p>
      {trend && (
        <p className={cn(
          "text-xs font-medium",
          trend.value > 0 ? "text-success" : trend.value < 0 ? "text-destructive" : "text-muted-foreground"
        )}>
          {trend.value > 0 ? "+" : ""}{trend.value}% {trend.label}
        </p>
      )}
    </div>
  );
}
