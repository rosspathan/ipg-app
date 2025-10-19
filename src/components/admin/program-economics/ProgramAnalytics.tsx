import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";
import { 
  TrendingUp, 
  Download, 
  Calendar as CalendarIcon,
  Users,
  DollarSign,
  Activity,
  Target,
  Award,
  Zap
} from "lucide-react";
import { format, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { ProgramWithConfig } from "@/hooks/useProgramEconomics";

interface ProgramAnalyticsProps {
  program: ProgramWithConfig;
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export function ProgramAnalytics({ program }: ProgramAnalyticsProps) {
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  });

  // Fetch program-specific analytics
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['program-analytics', program.id, dateRange],
    queryFn: async () => {
      // This would be replaced with actual queries based on program type
      return generateMockAnalytics(program.key);
    }
  });

  const handleExportCSV = () => {
    if (!analytics) return;
    
    const csv = convertToCSV(analytics);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${program.key}-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (isLoading || !analytics) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Range and Export */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">{program.name} Analytics</h3>
          <p className="text-muted-foreground">
            {format(dateRange.from, 'MMM dd, yyyy')} - {format(dateRange.to, 'MMM dd, yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Date Range
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-3 space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
                >
                  Last 7 Days
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
                >
                  Last 30 Days
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setDateRange({ from: subDays(new Date(), 90), to: new Date() })}
                >
                  Last 90 Days
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Render program-specific analytics */}
      {program.key === "spin-wheel" && <SpinWheelAnalytics data={analytics} />}
      {program.key === "lucky-draw" && <LuckyDrawAnalytics data={analytics} />}
      {program.key === "ad-mining" && <AdMiningAnalytics data={analytics} />}
      {program.key === "insurance" && <InsuranceAnalytics data={analytics} />}
      {program.key === "bsk-loan" && <BSKLoanAnalytics data={analytics} />}
      {program.key === "staking" && <StakingAnalytics data={analytics} />}
      {program.key === "bsk-promotions" && <BSKPromotionsAnalytics data={analytics} />}
      {program.key === "referrals_team" && <TeamReferralsAnalytics data={analytics} />}
    </div>
  );
}

// Spin Wheel Analytics
function SpinWheelAnalytics({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Total Spins"
          value={data.totalSpins.toLocaleString()}
          icon={<Activity className="h-4 w-4" />}
          trend={data.spinsTrend}
        />
        <StatCard
          title="Total Wagered"
          value={`${data.totalWagered.toLocaleString()} BSK`}
          icon={<DollarSign className="h-4 w-4" />}
          trend={data.wageredTrend}
        />
        <StatCard
          title="Total Won"
          value={`${data.totalWon.toLocaleString()} BSK`}
          icon={<Award className="h-4 w-4" />}
          trend={data.wonTrend}
        />
        <StatCard
          title="House Edge"
          value={`${data.houseEdge.toFixed(2)}%`}
          icon={<Target className="h-4 w-4" />}
          subtitle={`Target: ${data.targetHouseEdge}%`}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Spin Activity Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="spins" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                <Area type="monotone" dataKey="users" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bet Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.betDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.betDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Win/Loss Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.winLossAnalysis}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="wagered" fill="#8b5cf6" name="Wagered BSK" />
              <Bar dataKey="won" fill="#10b981" name="Won BSK" />
              <Bar dataKey="houseProfit" fill="#ef4444" name="House Profit" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// Lucky Draw Analytics
function LuckyDrawAnalytics({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Tickets Sold"
          value={data.ticketsSold.toLocaleString()}
          icon={<Activity className="h-4 w-4" />}
          trend={data.ticketsTrend}
        />
        <StatCard
          title="Active Pools"
          value={data.activePools}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          title="Avg Fill Rate"
          value={`${data.avgFillRate.toFixed(1)}%`}
          icon={<Target className="h-4 w-4" />}
        />
        <StatCard
          title="Total Prizes"
          value={`${data.totalPrizes.toLocaleString()} BSK`}
          icon={<Award className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pool Fill Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.poolProgress}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="pool" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="filled" fill="#10b981" name="Filled" />
                <Bar dataKey="remaining" fill="#94a3b8" name="Remaining" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prize Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.prizeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value} BSK`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.prizeDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Ad Mining Analytics
function AdMiningAnalytics({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Ads Watched"
          value={data.adsWatched.toLocaleString()}
          icon={<Activity className="h-4 w-4" />}
          trend={data.adsTrend}
        />
        <StatCard
          title="Completion Rate"
          value={`${data.completionRate.toFixed(1)}%`}
          icon={<Target className="h-4 w-4" />}
        />
        <StatCard
          title="BSK Distributed"
          value={`${data.bskDistributed.toLocaleString()} BSK`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Active Users"
          value={data.activeUsers.toLocaleString()}
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Ad Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.dailyActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="adsWatched" stroke="#8b5cf6" name="Ads Watched" />
              <Line type="monotone" dataKey="bskEarned" stroke="#10b981" name="BSK Earned" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// Insurance Analytics
function InsuranceAnalytics({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Active Policies"
          value={data.activePolicies.toLocaleString()}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          title="Total Claims"
          value={data.totalClaims.toLocaleString()}
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          title="Loss Ratio"
          value={`${data.lossRatio.toFixed(1)}%`}
          icon={<Target className="h-4 w-4" />}
        />
        <StatCard
          title="Premiums Collected"
          value={`${data.premiums.toLocaleString()} BSK`}
          icon={<DollarSign className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Claims vs Premiums</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="premiums" fill="#8b5cf6" name="Premiums" />
                <Bar dataKey="claims" fill="#ef4444" name="Claims Paid" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tier Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.tierDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.tierDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// BSK Loan Analytics
function BSKLoanAnalytics({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Total Disbursed"
          value={`${data.totalDisbursed.toLocaleString()} INR`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Repayment Rate"
          value={`${data.repaymentRate.toFixed(1)}%`}
          icon={<Target className="h-4 w-4" />}
        />
        <StatCard
          title="Default Rate"
          value={`${data.defaultRate.toFixed(1)}%`}
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          title="Active Loans"
          value={data.activeLoans.toLocaleString()}
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Loan Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.performance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="disbursed" fill="#8b5cf6" name="Disbursed" />
              <Bar dataKey="repaid" fill="#10b981" name="Repaid" />
              <Bar dataKey="overdue" fill="#ef4444" name="Overdue" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// Staking Analytics
function StakingAnalytics({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="BSK Staked"
          value={`${data.totalStaked.toLocaleString()} BSK`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Rewards Distributed"
          value={`${data.rewardsDistributed.toLocaleString()} BSK`}
          icon={<Award className="h-4 w-4" />}
        />
        <StatCard
          title="Realized APY"
          value={`${data.realizedAPY.toFixed(1)}%`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          title="Active Stakers"
          value={data.activeStakers.toLocaleString()}
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staking Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.growthTimeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="staked" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} name="Total Staked" />
              <Area type="monotone" dataKey="rewards" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Rewards" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// BSK Promotions Analytics
function BSKPromotionsAnalytics({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Bonus Distributed"
          value={`${data.bonusDistributed.toLocaleString()} BSK`}
          icon={<Award className="h-4 w-4" />}
        />
        <StatCard
          title="Conversion Rate"
          value={`${data.conversionRate.toFixed(1)}%`}
          icon={<Target className="h-4 w-4" />}
        />
        <StatCard
          title="ROI"
          value={`${data.roi.toFixed(1)}%`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          title="Participants"
          value={data.participants.toLocaleString()}
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.campaignData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="purchases" stroke="#8b5cf6" name="Purchases" />
              <Line type="monotone" dataKey="bonuses" stroke="#10b981" name="Bonuses Given" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// Team Referrals Analytics
function TeamReferralsAnalytics({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Total Referrals"
          value={data.totalReferrals.toLocaleString()}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          title="Active Referrers"
          value={data.activeReferrers.toLocaleString()}
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          title="Commission Paid"
          value={`${data.commissionPaid.toLocaleString()} BSK`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Avg Depth"
          value={`${data.avgDepth.toFixed(1)} levels`}
          icon={<Target className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Referrals by Level</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.levelDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8b5cf6" name="Referrals" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Commission Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.commissionHeatmap.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-sm w-20">{item.level}</span>
                  <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-20 text-right">
                    {item.value} BSK
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Reusable Stat Card Component
function StatCard({ 
  title, 
  value, 
  icon, 
  trend, 
  subtitle 
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  trend?: number;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{title}</span>
          <div className="p-2 rounded-full bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend >= 0 ? 'text-success' : 'text-destructive'}`}>
            <TrendingUp className={`h-3 w-3 ${trend < 0 ? 'rotate-180' : ''}`} />
            <span>{Math.abs(trend).toFixed(1)}% vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Mock data generator (would be replaced with actual queries)
function generateMockAnalytics(programKey: string) {
  const baseData = {
    spinWheel: {
      totalSpins: 12543,
      totalWagered: 256780,
      totalWon: 243120,
      houseEdge: 5.32,
      targetHouseEdge: 5.5,
      spinsTrend: 12.5,
      wageredTrend: 8.3,
      wonTrend: 7.9,
      timeline: generateTimeline(30, ['spins', 'users']),
      betDistribution: [
        { name: '10-50 BSK', value: 35 },
        { name: '50-100 BSK', value: 28 },
        { name: '100-500 BSK', value: 22 },
        { name: '500+ BSK', value: 15 }
      ],
      winLossAnalysis: generateDailyData(7, ['wagered', 'won', 'houseProfit'])
    },
    luckyDraw: {
      ticketsSold: 8432,
      activePools: 5,
      avgFillRate: 67.5,
      totalPrizes: 125000,
      ticketsTrend: 15.2,
      poolProgress: [
        { pool: 'Pool 1', filled: 85, remaining: 15 },
        { pool: 'Pool 2', filled: 92, remaining: 8 },
        { pool: 'Pool 3', filled: 45, remaining: 55 },
        { pool: 'Pool 4', filled: 78, remaining: 22 },
        { pool: 'Pool 5', filled: 23, remaining: 77 }
      ],
      prizeDistribution: [
        { name: '1st Prize', value: 50000 },
        { name: '2nd Prize', value: 35000 },
        { name: '3rd Prize', value: 40000 }
      ]
    },
    adMining: {
      adsWatched: 45678,
      completionRate: 87.3,
      bskDistributed: 23456,
      activeUsers: 1234,
      adsTrend: 18.5,
      dailyActivity: generateTimeline(14, ['adsWatched', 'bskEarned'])
    },
    insurance: {
      activePolicies: 342,
      totalClaims: 89,
      lossRatio: 45.2,
      premiums: 45000,
      monthlyData: generateMonthlyData(6, ['premiums', 'claims']),
      tierDistribution: [
        { name: 'Basic', value: 120 },
        { name: 'Standard', value: 150 },
        { name: 'Premium', value: 72 }
      ]
    },
    bskLoan: {
      totalDisbursed: 2345000,
      repaymentRate: 92.5,
      defaultRate: 3.2,
      activeLoans: 156,
      performance: generateWeeklyData(8, ['disbursed', 'repaid', 'overdue'])
    },
    staking: {
      totalStaked: 567890,
      rewardsDistributed: 12345,
      realizedAPY: 15.3,
      activeStakers: 892,
      growthTimeline: generateTimeline(30, ['staked', 'rewards'])
    },
    bskPromotions: {
      bonusDistributed: 89450,
      conversionRate: 23.5,
      roi: 156.7,
      participants: 1567,
      campaignData: generateTimeline(30, ['purchases', 'bonuses'])
    },
    referralsTeam: {
      totalReferrals: 5678,
      activeReferrers: 892,
      commissionPaid: 123456,
      avgDepth: 4.3,
      levelDistribution: Array.from({ length: 10 }, (_, i) => ({
        level: `L${i + 1}`,
        count: Math.floor(Math.random() * 1000) + 100
      })),
      commissionHeatmap: Array.from({ length: 10 }, (_, i) => ({
        level: `Level ${i + 1}`,
        percentage: Math.max(10, 100 - i * 10),
        value: Math.floor(Math.random() * 10000) + 1000
      }))
    }
  };

  const keyMap: Record<string, string> = {
    'spin-wheel': 'spinWheel',
    'lucky-draw': 'luckyDraw',
    'ad-mining': 'adMining',
    'insurance': 'insurance',
    'bsk-loan': 'bskLoan',
    'staking': 'staking',
    'bsk-promotions': 'bskPromotions',
    'referrals_team': 'referralsTeam'
  };

  return baseData[keyMap[programKey] as keyof typeof baseData] || baseData.spinWheel;
}

function generateTimeline(days: number, keys: string[]) {
  return Array.from({ length: days }, (_, i) => {
    const date = format(subDays(new Date(), days - i), 'MMM dd');
    const data: any = { date };
    keys.forEach(key => {
      data[key] = Math.floor(Math.random() * 1000) + 500;
    });
    return data;
  });
}

function generateDailyData(days: number, keys: string[]) {
  return Array.from({ length: days }, (_, i) => {
    const data: any = { day: `Day ${i + 1}` };
    keys.forEach(key => {
      data[key] = Math.floor(Math.random() * 50000) + 10000;
    });
    return data;
  });
}

function generateMonthlyData(months: number, keys: string[]) {
  return Array.from({ length: months }, (_, i) => {
    const data: any = { month: format(subDays(new Date(), (months - i) * 30), 'MMM') };
    keys.forEach(key => {
      data[key] = Math.floor(Math.random() * 20000) + 5000;
    });
    return data;
  });
}

function generateWeeklyData(weeks: number, keys: string[]) {
  return Array.from({ length: weeks }, (_, i) => {
    const data: any = { week: `W${i + 1}` };
    keys.forEach(key => {
      data[key] = Math.floor(Math.random() * 100000) + 20000;
    });
    return data;
  });
}

function convertToCSV(data: any): string {
  // Simple CSV conversion - would be enhanced based on data structure
  return 'CSV Export Feature - Implementation varies by program type';
}
