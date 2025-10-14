import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthAdmin } from "@/hooks/useAuthAdmin";
import { useProgramAnalytics, useProgramEngagement, useOverallProgramStats } from "@/hooks/useProgramAnalytics";
import { ProgramAnalyticsChart } from "@/components/admin/analytics/ProgramAnalyticsChart";
import { ProgramMetricsCard } from "@/components/admin/analytics/ProgramMetricsCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Users, Eye, DollarSign, Activity, ArrowLeft, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminProgramAnalytics() {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuthAdmin();
  const { stats, isLoading: statsLoading } = useOverallProgramStats();
  const { analytics, isLoading: analyticsLoading } = useProgramAnalytics();
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const { engagement } = useProgramEngagement(selectedModule || undefined);

  if (authLoading || statsLoading || analyticsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div data-testid="admin-program-analytics" className="space-y-6 pb-6">
      {/* Header */}
      <div className="px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin/programs')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Program Analytics
            </h1>
            <p className="text-sm text-muted-foreground">
              Performance insights and engagement metrics
            </p>
          </div>
        </div>
        <Button variant="outline" className="gap-2">
          <BarChart3 className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {/* Overall Stats */}
      <div className="px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ProgramMetricsCard
            title="Total Programs"
            value={stats?.totalPrograms || 0}
            description={`${stats?.livePrograms || 0} live programs`}
            icon={<Activity className="w-4 h-4" />}
            variant="success"
          />
          <ProgramMetricsCard
            title="Total Views"
            value={(stats?.totalViews || 0).toLocaleString()}
            trend="up"
            trendValue={`+${stats?.growthRate}%`}
            icon={<Eye className="w-4 h-4" />}
          />
          <ProgramMetricsCard
            title="Active Users"
            value={(stats?.totalUsers || 0).toLocaleString()}
            description="Engaged in programs"
            icon={<Users className="w-4 h-4" />}
          />
          <ProgramMetricsCard
            title="Total Revenue"
            value={`$${(stats?.totalRevenue || 0).toLocaleString()}`}
            trend="up"
            trendValue="+12.5%"
            icon={<DollarSign className="w-4 h-4" />}
            variant="success"
          />
        </div>
      </div>

      {/* Engagement Chart */}
      {selectedModule && engagement && (
        <div className="px-4">
          <ProgramAnalyticsChart
            data={engagement}
            title="Program Engagement Over Time"
            description="30-day trend showing views, users, and conversions"
            type="area"
          />
        </div>
      )}

      {/* Program Performance Table */}
      <div className="px-4">
        <Card>
          <CardHeader>
            <CardTitle>Program Performance</CardTitle>
            <CardDescription>Detailed metrics for each program</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.map((program) => (
                <div
                  key={program.moduleId}
                  onClick={() => setSelectedModule(program.moduleId)}
                  className={cn(
                    "p-4 rounded-xl border cursor-pointer transition-all",
                    "bg-card hover:bg-accent/5 hover:border-primary/30",
                    selectedModule === program.moduleId && "border-primary bg-accent/10"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{program.moduleName}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {program.totalViews.toLocaleString()} views • {program.activeUsers.toLocaleString()} active users
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        program.trend === 'up' && 'bg-success/10 text-success border-success/20',
                        program.trend === 'down' && 'bg-destructive/10 text-destructive border-destructive/20',
                        program.trend === 'stable' && 'bg-muted/10 text-muted-foreground border-muted/20'
                      )}
                    >
                      {program.trend === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
                      {program.trend.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Conversion Rate</p>
                      <p className="text-lg font-semibold text-foreground">
                        {program.conversionRate.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <p className="text-lg font-semibold text-foreground">
                        ${program.revenue.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Engagement</p>
                      <p className="text-lg font-semibold text-foreground">
                        {program.engagement.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
