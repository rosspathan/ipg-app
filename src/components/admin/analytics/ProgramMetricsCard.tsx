import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgramMetricsCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function ProgramMetricsCard({
  title,
  value,
  description,
  trend,
  trendValue,
  icon,
  variant = 'default'
}: ProgramMetricsCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <ArrowUpRight className="w-3 h-3" />;
      case 'down': return <ArrowDownRight className="w-3 h-3" />;
      default: return <Minus className="w-3 h-3" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'bg-success/10 text-success border-success/20';
      case 'down': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const getVariantColor = () => {
    switch (variant) {
      case 'success': return 'text-success';
      case 'warning': return 'text-warning';
      case 'danger': return 'text-destructive';
      default: return 'text-primary';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className={cn("text-muted-foreground", getVariantColor())}>{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <CardDescription className="mt-1">{description}</CardDescription>
        )}
        {trend && trendValue && (
          <Badge variant="outline" className={cn("mt-2 gap-1", getTrendColor())}>
            {getTrendIcon()}
            {trendValue}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
