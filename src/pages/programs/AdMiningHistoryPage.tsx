import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MonitorPlay, TrendingUp, Calendar, Sparkles, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdMiningHistoryPage() {
  const { user } = useAuthUser();
  const navigate = useNavigate();

  const { data: subscriptions, isLoading: loadingSubs } = useQuery({
    queryKey: ['ad-subscriptions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('ad_user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: adClicks, isLoading: loadingClicks } = useQuery({
    queryKey: ['ad-clicks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('ad_clicks')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Calculate daily earnings
  const dailyEarnings = adClicks?.reduce((acc: any[], click) => {
    const date = format(new Date(click.started_at), 'yyyy-MM-dd');
    const existing = acc.find(d => d.date === date);
    if (existing) {
      existing.bsk += click.reward_bsk || 0;
      existing.count += 1;
    } else {
      acc.push({
        date,
        bsk: click.reward_bsk || 0,
        count: 1
      });
    }
    return acc;
  }, []).slice(0, 30).reverse() || [];

  const totalEarned = adClicks?.reduce((sum, click) => sum + (click.reward_bsk || 0), 0) || 0;
  const totalAdsWatched = adClicks?.filter(c => c.rewarded).length || 0;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, className: 'bg-green-500 text-white', icon: CheckCircle },
      expired: { variant: 'secondary' as const, className: 'bg-gray-500 text-white', icon: AlertCircle },
      pending: { variant: 'outline' as const, className: 'border-yellow-500 text-yellow-600', icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={cn('flex items-center gap-1', config.className)}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">Please log in to view your ad mining history.</p>
          <Button onClick={() => navigate('/auth/login')}>Log In</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <MonitorPlay className="w-8 h-8 text-primary" />
              Ad Mining History
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your ad viewing earnings and subscriptions
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/app/programs/advertising')}>
            <MonitorPlay className="w-4 h-4 mr-2" />
            Watch Ads
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 bg-gradient-to-br from-green-50 to-transparent dark:from-green-950/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalEarned.toFixed(2)} BSK</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-950/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <MonitorPlay className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ads Watched</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalAdsWatched}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-transparent dark:from-purple-950/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {subscriptions?.filter(s => s.status === 'active').length || 0}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Earnings Chart */}
        {dailyEarnings.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Daily Earnings (Last 30 Days)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyEarnings}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: any) => [`${value.toFixed(2)} BSK`, 'Earned']}
                  labelFormatter={(label) => format(new Date(label), 'MMM dd, yyyy')}
                />
                <Line 
                  type="monotone" 
                  dataKey="bsk" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        <Tabs defaultValue="subscriptions" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="subscriptions">
              <Calendar className="w-4 h-4 mr-2" />
              Subscriptions ({subscriptions?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="history">
              <MonitorPlay className="w-4 h-4 mr-2" />
              Ad History ({adClicks?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-4">
            {loadingSubs ? (
              <Card className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading subscriptions...</p>
              </Card>
            ) : subscriptions && subscriptions.length > 0 ? (
              subscriptions.map((sub) => {
                const daysRemaining = Math.ceil(
                  (new Date(sub.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <Card key={sub.id} className="p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(sub.status)}
                          <Badge variant="outline">Tier: ₹{sub.tier_inr}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Started: {format(new Date(sub.start_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Daily BSK</p>
                        <p className="text-2xl font-bold text-primary">{sub.daily_bsk}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Earned</p>
                        <p className="text-lg font-bold text-green-600">{sub.total_earned_bsk} BSK</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="text-lg font-bold">{sub.days_total} days</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Missed Days</p>
                        <p className="text-lg font-bold text-red-600">{sub.total_missed_days}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {sub.status === 'active' ? 'Days Remaining' : 'Ended On'}
                        </p>
                        <p className="text-lg font-bold">
                          {sub.status === 'active' 
                            ? `${daysRemaining} days`
                            : format(new Date(sub.end_date), 'MMM dd')}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })
            ) : (
              <Card className="p-12 text-center">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Subscriptions</h3>
                <p className="text-muted-foreground mb-4">You haven't subscribed to any ad plans yet.</p>
                <Button onClick={() => navigate('/app/programs/advertising')}>
                  <MonitorPlay className="w-4 h-4 mr-2" />
                  View Plans
                </Button>
              </Card>
            )}
          </TabsContent>

          {/* Ad History Tab */}
          <TabsContent value="history" className="space-y-3">
            {loadingClicks ? (
              <Card className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading ad history...</p>
              </Card>
            ) : adClicks && adClicks.length > 0 ? (
              adClicks.map((click) => (
                <Card key={click.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        click.rewarded ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-100 dark:bg-gray-900/30"
                      )}>
                        <MonitorPlay className={cn(
                          "w-5 h-5",
                          click.rewarded ? "text-green-600 dark:text-green-400" : "text-gray-600"
                        )} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {click.rewarded ? 'Ad Completed' : 'Ad Viewed'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(click.started_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {click.rewarded ? (
                        <p className="text-lg font-bold text-green-600">+{click.reward_bsk} BSK</p>
                      ) : (
                        <Badge variant="outline">Not Completed</Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-12 text-center">
                <MonitorPlay className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Ad History</h3>
                <p className="text-muted-foreground mb-4">Start watching ads to earn BSK rewards.</p>
                <Button onClick={() => navigate('/app/programs/advertising')}>
                  <MonitorPlay className="w-4 h-4 mr-2" />
                  Watch Ads Now
                </Button>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
