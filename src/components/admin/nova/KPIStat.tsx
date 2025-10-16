import * as React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPIStatProps {
  label: string;
  value: string | number;
  delta?: {
    value: number;
    trend: "up" | "down";
  };
  sparkline?: number[];
  icon?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
  className?: string;
}

/**
 * KPIStat - Compact metric card
 * - Value, delta, mini-sparkline
 * - Tabular numbers for alignment
 * - Color variants for status
 */
export function KPIStat({
  label,
  value,
  delta,
  sparkline,
  icon,
  variant = "default",
  className,
}: KPIStatProps) {
  const variantStyles = {
    default: "border-[hsl(225_24%_22%/0.16)]",
    success: "border-success/20 bg-success/5",
    warning: "border-warning/20 bg-warning/5",
    danger: "border-danger/20 bg-danger/5",
  };

  return (
    <div
      data-testid="kpi-stat"
      role="article"
      aria-label={`${label}: ${value}`}
      className={cn(
        "min-w-[160px] p-4 rounded-2xl",
        "bg-[hsl(229_30%_16%/0.5)] border",
        "backdrop-blur-sm",
        "transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
        "animate-fade-in-scale",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        {icon && (
          <div className="text-muted-foreground transition-transform duration-200 hover:scale-110" aria-hidden="true">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <p className="text-2xl font-heading font-bold text-foreground tabular-nums animate-count-up">
          {value}
        </p>
        
        {delta && (
          <div
            className={cn(
              "flex items-center gap-0.5 text-xs font-medium transition-colors duration-200",
              delta.trend === "up" ? "text-success" : "text-danger"
            )}
            role="status"
            aria-label={`${delta.trend === "up" ? "Increased" : "Decreased"} by ${Math.abs(delta.value)} percent`}
          >
            {delta.trend === "up" ? (
              <TrendingUp className="w-3 h-3 animate-bounce-subtle" aria-hidden="true" />
            ) : (
              <TrendingDown className="w-3 h-3 animate-bounce-subtle" aria-hidden="true" />
            )}
            <span className="tabular-nums">{Math.abs(delta.value)}%</span>
          </div>
        )}
      </div>

      {sparkline && sparkline.length > 0 && (
        <MiniSparkline data={sparkline} variant={variant} />
      )}
    </div>
  );
}

function MiniSparkline({
  data,
  variant,
}: {
  data: number[];
  variant: KPIStatProps["variant"];
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * 100;
      const y = 100 - ((val - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  const strokeColor =
    variant === "success"
      ? "hsl(152 64% 48%)"
      : variant === "danger"
      ? "hsl(0 100% 68%)"
      : variant === "warning"
      ? "hsl(33 93% 60%)"
      : "hsl(262 100% 65%)";

  return (
    <svg
      className="w-full h-8 mt-2"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
