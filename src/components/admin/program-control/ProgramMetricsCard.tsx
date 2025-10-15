import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Users,
  DollarSign,
  Activity,
  Target
} from "lucide-react";

interface ProgramMetrics {
  activeUsers: number;
  totalParticipations: number;
  revenue: number;
  conversionRate: number;
  avgEngagementTime: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

interface ProgramMetricsCardProps {
  programName: string;
  metrics: ProgramMetrics;
}

export function ProgramMetricsCard({ programName, metrics }: ProgramMetricsCardProps) {
  const getTrendIcon = () => {
    switch (metrics.trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-success" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = () => {
    switch (metrics.trend) {
      case 'up':
        return 'text-success';
      case 'down':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{programName}</CardTitle>
          <div className="flex items-center gap-1">
            {getTrendIcon()}
            <span className={`text-sm font-medium ${getTrendColor()}`}>
              {metrics.changePercent > 0 ? '+' : ''}{metrics.changePercent}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Active Users</span>
            </div>
            <p className="text-xl font-bold">{metrics.activeUsers.toLocaleString()}</p>
          </div>

          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Revenue</span>
            </div>
            <p className="text-xl font-bold text-success">
              ${metrics.revenue.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-muted/10 rounded">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Participations</span>
            </div>
            <span className="text-sm font-medium">
              {metrics.totalParticipations.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between p-2 bg-muted/10 rounded">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Conversion Rate</span>
            </div>
            <Badge variant="secondary">
              {metrics.conversionRate.toFixed(1)}%
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
