import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  Sankey,
  Rectangle
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Users,
  Activity,
  Lock,
  Zap,
  ArrowLeft
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f43f5e'];

export default function ProgramEconomicsAnalytics() {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');

  // Fetch global analytics data
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['global-program-analytics', timeframe],
    queryFn: async () => {
      // Mock data - would be replaced with actual queries
      return generateGlobalAnalytics();
    }
  });

  if (isLoading || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin/program-economics">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Global Program Economics</h1>
              <p className="text-muted-foreground mt-1">
                Comprehensive overview of all programs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={timeframe === '7d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeframe('7d')}
            >
              7 Days
            </Button>
            <Button
              variant={timeframe === '30d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeframe('30d')}
            >
              30 Days
            </Button>
            <Button
              variant={timeframe === '90d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeframe('90d')}
            >
              90 Days
            </Button>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total BSK Circulation</span>
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold">{analytics.bskCirculation.toLocaleString()} BSK</div>
              <div className="flex items-center gap-1 mt-2 text-xs text-success">
                <TrendingUp className="h-3 w-3" />
                <span>12.5% vs last period</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Active Users</span>
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold">{analytics.activeUsers.toLocaleString()}</div>
              <div className="flex items-center gap-1 mt-2 text-xs text-success">
                <TrendingUp className="h-3 w-3" />
                <span>8.3% vs last period</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">BSK Locked</span>
                <Lock className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold">{analytics.bskLocked.toLocaleString()} BSK</div>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <span>{analytics.lockPercentage.toFixed(1)}% of circulation</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">BSK Reserves</span>
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold">{analytics.bskReserves.toLocaleString()} BSK</div>
              <div className="flex items-center gap-1 mt-2 text-xs text-destructive">
                <TrendingDown className="h-3 w-3" />
                <span>3.2% vs last period</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Analytics */}
        <Tabs defaultValue="revenue" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="revenue">Revenue Breakdown</TabsTrigger>
            <TabsTrigger value="flow">BSK Flow</TabsTrigger>
            <TabsTrigger value="engagement">User Engagement</TabsTrigger>
            <TabsTrigger value="health">Financial Health</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Program</CardTitle>
                  <CardDescription>BSK distributed across all programs</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={analytics.revenueByProgram}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.percentage}%`}
                        outerRadius={140}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {analytics.revenueByProgram.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Program Performance</CardTitle>
                  <CardDescription>Ranked by BSK distributed</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.revenueByProgram.map((program: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        <span className="text-sm flex-1">{program.name}</span>
                        <span className="text-sm font-semibold">{program.value.toLocaleString()} BSK</span>
                        <span className="text-xs text-muted-foreground w-16 text-right">
                          {program.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
                <CardDescription>Daily BSK distribution by program</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.revenueTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {Object.keys(analytics.revenueTrends[0] || {})
                      .filter(key => key !== 'date')
                      .map((key, idx) => (
                        <Line 
                          key={key}
                          type="monotone" 
                          dataKey={key} 
                          stroke={COLORS[idx % COLORS.length]} 
                          name={key}
                        />
                      ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="flow" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>BSK Flow Diagram</CardTitle>
                <CardDescription>Sources and destinations of BSK tokens</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">Sources (Incoming)</h4>
                      {analytics.bskFlow.sources.map((source: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <span className="text-sm">{source.name}</span>
                          <span className="font-semibold text-success">+{source.value.toLocaleString()} BSK</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">Destinations (Outgoing)</h4>
                      {analytics.bskFlow.destinations.map((dest: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <span className="text-sm">{dest.name}</span>
                          <span className="font-semibold text-destructive">-{dest.value.toLocaleString()} BSK</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Net BSK Flow</span>
                      <span className={`text-xl font-bold ${analytics.bskFlow.net >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {analytics.bskFlow.net >= 0 ? '+' : ''}{analytics.bskFlow.net.toLocaleString()} BSK
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>BSK Movement Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.flowTimeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="incoming" fill="#10b981" name="Incoming BSK" />
                    <Bar dataKey="outgoing" fill="#ef4444" name="Outgoing BSK" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>DAU/MAU by Program</CardTitle>
                  <CardDescription>Daily and monthly active users</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={analytics.engagementByProgram}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="program" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="dau" fill="#8b5cf6" name="DAU" />
                      <Bar dataKey="mau" fill="#06b6d4" name="MAU" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>User Stickiness</CardTitle>
                  <CardDescription>DAU/MAU ratio by program</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.engagementByProgram.map((program: any, idx: number) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{program.program}</span>
                          <span className="font-semibold">{program.stickiness}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all" 
                            style={{ width: `${program.stickiness}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>User Engagement Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.engagementTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="dau" stroke="#8b5cf6" name="Daily Active Users" />
                    <Line type="monotone" dataKey="mau" stroke="#06b6d4" name="Monthly Active Users" />
                    <Line type="monotone" dataKey="newUsers" stroke="#10b981" name="New Users" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="health" className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-success bg-success/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Healthy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">{analytics.healthIndicators.healthy}</div>
                  <p className="text-xs text-muted-foreground">Programs operating optimally</p>
                </CardContent>
              </Card>

              <Card className="border-warning bg-warning/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Warning</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">{analytics.healthIndicators.warning}</div>
                  <p className="text-xs text-muted-foreground">Programs need attention</p>
                </CardContent>
              </Card>

              <Card className="border-destructive bg-destructive/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Critical</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">{analytics.healthIndicators.critical}</div>
                  <p className="text-xs text-muted-foreground">Programs require immediate action</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Program Health Status</CardTitle>
                <CardDescription>Detailed health metrics for each program</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.programHealthDetails.map((program: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            program.status === 'healthy' ? 'bg-success' :
                            program.status === 'warning' ? 'bg-warning' : 'bg-destructive'
                          }`} />
                          <span className="font-semibold">{program.name}</span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          program.status === 'healthy' ? 'bg-success/10 text-success' :
                          program.status === 'warning' ? 'bg-warning/10 text-warning' : 
                          'bg-destructive/10 text-destructive'
                        }`}>
                          {program.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Utilization</p>
                          <p className="font-semibold">{program.utilization}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Profitability</p>
                          <p className="font-semibold">{program.profitability}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">User Satisfaction</p>
                          <p className="font-semibold">{program.satisfaction}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Health Score</p>
                          <p className="font-semibold">{program.healthScore}/100</p>
                        </div>
                      </div>

                      {program.issues.length > 0 && (
                        <div className="mt-3 p-2 rounded bg-muted/50">
                          <p className="text-xs text-muted-foreground mb-1">Issues:</p>
                          <ul className="text-xs space-y-1">
                            {program.issues.map((issue: string, i: number) => (
                              <li key={i}>• {issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reserve Ratio Trends</CardTitle>
                <CardDescription>BSK reserves vs circulation over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.reserveTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="reserves" stroke="#8b5cf6" name="Reserves" />
                    <Line type="monotone" dataKey="circulation" stroke="#06b6d4" name="Circulation" />
                    <Line type="monotone" dataKey="ratio" stroke="#10b981" name="Reserve Ratio %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Mock data generator
function generateGlobalAnalytics() {
  return {
    bskCirculation: 5678900,
    activeUsers: 12543,
    bskLocked: 1234567,
    lockPercentage: 21.7,
    bskReserves: 987654,

    revenueByProgram: [
      { name: 'Spin Wheel', value: 256780, percentage: 32 },
      { name: 'Lucky Draw', value: 189000, percentage: 24 },
      { name: 'Team Referrals', value: 145600, percentage: 18 },
      { name: 'Ad Mining', value: 98700, percentage: 12 },
      { name: 'Staking', value: 67800, percentage: 8 },
      { name: 'BSK Loans', value: 34500, percentage: 4 },
      { name: 'Insurance', value: 12300, percentage: 2 }
    ],

    revenueTrends: Array.from({ length: 30 }, (_, i) => ({
      date: `Day ${i + 1}`,
      'Spin Wheel': Math.floor(Math.random() * 10000) + 5000,
      'Lucky Draw': Math.floor(Math.random() * 8000) + 4000,
      'Referrals': Math.floor(Math.random() * 6000) + 3000
    })),

    bskFlow: {
      sources: [
        { name: 'User Deposits', value: 567890 },
        { name: 'Swap Transactions', value: 234560 },
        { name: 'Badge Purchases', value: 123450 },
        { name: 'Other', value: 45670 }
      ],
      destinations: [
        { name: 'User Withdrawals', value: 345600 },
        { name: 'Program Rewards', value: 234500 },
        { name: 'Referral Commissions', value: 123400 },
        { name: 'Staking Rewards', value: 67800 },
        { name: 'Other', value: 23450 }
      ],
      net: 176820
    },

    flowTimeline: Array.from({ length: 14 }, (_, i) => ({
      date: `Day ${i + 1}`,
      incoming: Math.floor(Math.random() * 50000) + 30000,
      outgoing: Math.floor(Math.random() * 40000) + 25000
    })),

    engagementByProgram: [
      { program: 'Spin Wheel', dau: 2345, mau: 8900, stickiness: 26 },
      { program: 'Lucky Draw', dau: 1890, mau: 7200, stickiness: 26 },
      { program: 'Ad Mining', dau: 3456, mau: 10200, stickiness: 34 },
      { program: 'Referrals', dau: 890, mau: 5600, stickiness: 16 },
      { program: 'Staking', dau: 567, mau: 2300, stickiness: 25 },
      { program: 'Insurance', dau: 234, mau: 890, stickiness: 26 },
      { program: 'Loans', dau: 156, mau: 670, stickiness: 23 }
    ],

    engagementTrends: Array.from({ length: 30 }, (_, i) => ({
      date: `Day ${i + 1}`,
      dau: Math.floor(Math.random() * 5000) + 8000,
      mau: Math.floor(Math.random() * 3000) + 30000,
      newUsers: Math.floor(Math.random() * 500) + 200
    })),

    healthIndicators: {
      healthy: 5,
      warning: 2,
      critical: 1
    },

    programHealthDetails: [
      {
        name: 'Spin Wheel',
        status: 'healthy',
        utilization: 87,
        profitability: 5.3,
        satisfaction: 92,
        healthScore: 85,
        issues: []
      },
      {
        name: 'Lucky Draw',
        status: 'healthy',
        utilization: 78,
        profitability: 12.5,
        satisfaction: 88,
        healthScore: 82,
        issues: []
      },
      {
        name: 'Ad Mining',
        status: 'warning',
        utilization: 92,
        profitability: -2.1,
        satisfaction: 75,
        healthScore: 68,
        issues: ['High budget burn rate', 'Completion rate declining']
      },
      {
        name: 'BSK Loans',
        status: 'critical',
        utilization: 45,
        profitability: -8.5,
        satisfaction: 65,
        healthScore: 42,
        issues: ['High default rate (5.2%)', 'Low utilization', 'Requires immediate review']
      },
      {
        name: 'Team Referrals',
        status: 'healthy',
        utilization: 67,
        profitability: 8.9,
        satisfaction: 85,
        healthScore: 78,
        issues: []
      }
    ],

    reserveTrends: Array.from({ length: 30 }, (_, i) => ({
      date: `Day ${i + 1}`,
      reserves: Math.floor(Math.random() * 100000) + 900000,
      circulation: Math.floor(Math.random() * 200000) + 5000000,
      ratio: Math.floor(Math.random() * 5) + 15
    }))
  };
}
