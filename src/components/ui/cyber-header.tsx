import React from "react";
import { cn } from "@/lib/utils";
import { KpiChip } from "./kpi-chip";
import { ArrowLeft, Settings, Bell } from "lucide-react";
import { Button } from "./button";

interface CyberHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  kpis?: Array<{
    label: string;
    value: string | number;
    delta?: number;
    variant?: "default" | "success" | "warning" | "danger" | "primary";
  }>;
  actions?: React.ReactNode;
  className?: string;
}

const CyberHeader: React.FC<CyberHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  kpis = [],
  actions,
  className
}) => {
  return (
    <div className={cn(
      "relative p-4 pb-2 space-y-4",
      "bg-gradient-to-b from-card-glass/50 to-transparent",
      "backdrop-blur-[12px] border-b border-white/5",
      className
    )}>
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {showBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="p-2 hover:bg-primary/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        {actions || (
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="p-2">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>

      {/* KPI Row */}
      {kpis.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {kpis.map((kpi, index) => (
            <KpiChip
              key={index}
              variant={kpi.variant}
              value={kpi.value}
              label={kpi.label}
              delta={kpi.delta}
              animate
              className="flex-shrink-0"
              style={{ animationDelay: `${index * 40}ms` }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export { CyberHeader };