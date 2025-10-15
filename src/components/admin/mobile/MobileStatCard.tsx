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

  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">{title}</p>
        <Icon className={cn("w-4 h-4", variantClasses[variant])} />
      </div>
      <p className="text-xl font-bold mb-1">{value}</p>
      {trend && (
        <p className={cn(
          "text-xs",
          trend.value > 0 ? "text-success" : trend.value < 0 ? "text-destructive" : "text-muted-foreground"
        )}>
          {trend.value > 0 ? "+" : ""}{trend.value}% {trend.label}
        </p>
      )}
    </div>
  );
}
