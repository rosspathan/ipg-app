import { useNavigate } from "react-router-dom";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import BalanceDisplay from "@/components/BalanceDisplay";
import QuickActionGrid from "@/components/QuickActionGrid";
import { Bell, Star, Zap, Activity, Users, Gift } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const AppHomeScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuthUser();

  // Mock data - in real app this would come from APIs
  const totalBalance = 15247.82;
  const change24h = 5.67;

  const handleAddFunds = () => {
    navigate("/app/wallet/deposit");
  };

  const handleCopyAddress = () => {
    // Mock wallet address
    const address = "0x742d35Cc6135C5C8C91b8f54534d7134E6faE9A2";
    navigator.clipboard.writeText(address);
    toast({
      title: "Address Copied",
      description: "Wallet address copied to clipboard",
    });
  };

  const featuredActions = [
    {
      title: "Staking Rewards",
      description: "Earn 12% APY on your crypto",
      icon: Star,
      color: "text-yellow-400",
      action: () => navigate("/app/programs/staking"),
      gradient: "from-yellow-500/20 to-orange-500/20"
    },
    {
      title: "Spin & Win",
      description: "Daily rewards await",
      icon: Zap,
      color: "text-purple-400", 
      action: () => navigate("/app/spin"),
      gradient: "from-purple-500/20 to-pink-500/20"
    },
    {
      title: "Live Trading",
      description: "Real-time market data",
      icon: Activity,
      color: "text-green-400",
      action: () => navigate("/app/markets"),
      gradient: "from-green-500/20 to-emerald-500/20"
    },
    {
      title: "Referrals",
      description: "Earn with friends", 
      icon: Users,
      color: "text-blue-400",
      action: () => navigate("/app/programs/referrals"),
      gradient: "from-blue-500/20 to-cyan-500/20"
    }
  ];

  return (
    <div className="min-h-screen bg-background p-4 space-y-6 animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-primary p-0.5">
            <img 
              src="/lovable-uploads/a9cfc5de-7126-4662-923b-cc0348077e3d.png" 
              alt="I-SMART Logo" 
              className="w-full h-full rounded-full object-cover bg-background"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-neon bg-clip-text text-transparent">
              I-SMART
            </h1>
            <p className="text-sm text-muted-foreground">
              Welcome back!
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="sm"
            className="relative ripple"
            onClick={() => navigate("/app/notifications")}
          >
            <Bell className="h-5 w-5" />
            <div className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full animate-glow-pulse" />
          </Button>
          <Badge variant="secondary" className="bg-background/20 text-foreground px-3">
            {user?.email?.split('@')[0]}
          </Badge>
        </div>
      </div>

      {/* Balance Display */}
      <BalanceDisplay
        balance={totalBalance}
        change24h={change24h}
        onAddFunds={handleAddFunds}
        className="animate-fade-in-scale"
        style={{ animationDelay: "200ms", animationFillMode: "both" }}
      />

      {/* Quick Action Grid */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground/90">Quick Actions</h3>
        <QuickActionGrid
          onRewards={() => navigate("/app/programs")}
          onEarn={() => navigate("/app/programs/staking")}
          onCopyAddress={handleCopyAddress}
          onMarkets={() => navigate("/app/markets")}
          onMore={() => navigate("/app/profile")}
          className="animate-fade-in-scale"
          style={{ animationDelay: "400ms", animationFillMode: "both" }}
        />
      </div>

      {/* Featured Actions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground/90">Discover</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {featuredActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <GlassCard
                key={action.title}
                hover="glow"
                className={cn(
                  "cursor-pointer bg-gradient-to-br border-border/30",
                  action.gradient,
                  "animate-fade-in-scale"
                )}
                style={{ 
                  animationDelay: `${600 + index * 100}ms`,
                  animationFillMode: "both"
                }}
                onClick={action.action}
              >
                <GlassCardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg bg-background/20 border border-border/30"
                    )}>
                      <Icon className={cn("h-5 w-5", action.color)} />
                    </div>
                    <div>
                      <GlassCardTitle className="text-base font-semibold text-foreground">
                        {action.title}
                      </GlassCardTitle>
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </GlassCardHeader>
              </GlassCard>
            );
          })}
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <GlassCard 
        className="animate-fade-in-scale border-border/30" 
        style={{ animationDelay: "1000ms", animationFillMode: "both" }}
      >
        <GlassCardHeader>
          <GlassCardTitle className="text-base flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Recent Activity
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Gift className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No recent activity</p>
            <p className="text-sm">Start trading to see your activity here</p>
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
};

export default AppHomeScreen;