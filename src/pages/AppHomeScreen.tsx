import { useNavigate } from "react-router-dom";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CyberCard, CyberCardContent, CyberCardHeader, CyberCardTitle } from "@/components/ui/cyber-card";
import { CyberHeader } from "@/components/ui/cyber-header";
import { NeonIconTile } from "@/components/ui/neon-icon-tile";
import BalanceDisplay from "@/components/BalanceDisplay";
import QuickActionGrid from "@/components/QuickActionGrid";
import { Bell, Star, Zap, Activity, Users, Gift, Coins, TrendingUp, Gamepad2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import bgOption1 from "@/assets/bg-option-1.png";
import bgOption2 from "@/assets/bg-option-2.png";
import bgOption5 from "@/assets/bg-option-5.png";
import bgOption6 from "@/assets/bg-option-6.png";
import bgIpgLogo from "@/assets/bg-ipg-logo.png";
import bgCryptoBlockchain from "@/assets/bg-crypto-blockchain.png";
import bgHolographicCircuit from "@/assets/bg-holographic-circuit.png";
import ipgLogo3D from "@/assets/ipg-logo-3d.png";

const AppHomeScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuthUser();

  // Mock data - in real app this would come from APIs
  const totalBalance = 15247.82;
  const change24h = 5.67;

  // KPI data for cyber header
  const kpis = [
    { label: "24h P&L", value: "+5.67%", delta: 5.67, variant: "success" as const },
    { label: "Portfolio", value: "$15.2K" },
    { label: "APY", value: "12.4%" },
  ];

  // Quick action tiles
  const quickActions = [
    { name: "Rewards", icon: Gift, variant: "primary" as const, route: "/app/programs" },
    { name: "Staking", icon: Coins, variant: "accent" as const, route: "/app/programs/staking" },
    { name: "Trading", icon: TrendingUp, variant: "secondary" as const, route: "/app/markets" },
    { name: "Games", icon: Gamepad2, variant: "default" as const, route: "/app/spin", badge: "NEW" },
    { name: "Profile", icon: Users, variant: "default" as const, route: "/app/profile" },
    { name: "History", icon: Activity, variant: "default" as const, route: "/app/history" },
    { name: "Support", icon: Bell, variant: "default" as const, route: "/app/support" },
    { name: "More+", icon: Star, variant: "default" as const, route: "/app/programs" },
  ];

  const featuredPrograms = [
    {
      title: "Staking Rewards",
      description: "Earn 12.4% APY on your crypto holdings",
      icon: Star,
      color: "text-warning",
      action: () => navigate("/app/programs/staking"),
      gradient: "from-warning/20 to-primary/20",
      badge: "HOT"
    },
    {
      title: "Spin & Win",
      description: "Daily rewards and jackpots await", 
      icon: Zap,
      color: "text-primary", 
      action: () => navigate("/app/spin"),
      gradient: "from-primary/20 to-secondary/20",
      badge: "DAILY"
    },
    {
      title: "Live Trading",
      description: "Real-time market data & advanced tools",
      icon: Activity,
      color: "text-success",
      action: () => navigate("/app/markets"),
      gradient: "from-success/20 to-accent/20"
    },
    {
      title: "Referral Program",
      description: "Earn with friends & grow your network", 
      icon: Users,
      color: "text-secondary",
      action: () => navigate("/app/programs/referrals"),
      gradient: "from-secondary/20 to-primary/20"
    }
  ];

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

  return (
    <div 
      className="min-h-screen w-full animate-slide-in-right relative"
      style={{
        backgroundImage: `url(${bgHolographicCircuit})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay for better content readability */}
      <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px]"></div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Cyber Header with KPIs */}
        <CyberHeader
          title="I-SMART"
          subtitle="Welcome back to your digital future"
          logo={ipgLogo3D}
          kpis={kpis}
          actions={
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm"
                className="relative p-2 hover:bg-primary/10"
                onClick={() => navigate("/app/notifications")}
              >
                <Bell className="h-5 w-5" />
                <div className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full animate-neon-pulse" />
              </Button>
              <Badge variant="secondary" className="bg-card-glass border-primary/20 text-primary font-bold px-3">
                {user?.email?.split('@')[0]}
              </Badge>
            </div>
          }
        />

      <div className="p-4 space-y-6">
        {/* Balance Display */}
        <BalanceDisplay
          balance={totalBalance}
          change24h={change24h}
          onAddFunds={handleAddFunds}
          className="animate-fade-in-scale"
          style={{ animationDelay: "200ms", animationFillMode: "both" }}
        />

        {/* Quick Actions Grid - Cyberpunk Style */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground tracking-tight">Quick Access</h3>
          <div className="grid grid-cols-4 gap-3">
            {quickActions.slice(0, 8).map((action, index) => (
              <NeonIconTile
                key={action.name}
                icon={action.icon}
                label={action.name}
                variant={action.variant}
                badge={action.badge}
                glow={index === 0 ? "strong" : index < 4 ? "subtle" : "none"}
                onClick={() => navigate(action.route)}
                className={cn(
                  "animate-slide-up-stagger"
                )}
                style={{ 
                  animationDelay: `${300 + index * 60}ms`,
                  animationFillMode: "both"
                }}
              />
            ))}
          </div>
        </div>

        {/* Featured Programs - Enhanced Cyberpunk Cards */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground tracking-tight">Featured Programs</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {featuredPrograms.map((program, index) => {
              const Icon = program.icon;
              return (
                <CyberCard
                  key={program.title}
                  variant="elevated"
                  className={cn(
                    "cursor-pointer group relative overflow-hidden",
                    "bg-gradient-to-br border-white/10 hover:border-primary/30",
                    program.gradient,
                    "animate-slide-up-stagger"
                  )}
                  style={{ 
                    animationDelay: `${600 + index * 120}ms`,
                    animationFillMode: "both"
                  }}
                  onClick={program.action}
                >
                  {program.badge && (
                    <div className="absolute top-3 right-3 z-10">
                      <Badge className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 animate-neon-pulse">
                        {program.badge}
                      </Badge>
                    </div>
                  )}
                  
                  <CyberCardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "relative p-3 rounded-xl bg-card-glass backdrop-blur-[14px]",
                        "border border-white/20 group-hover:border-primary/40",
                        "transition-all duration-normal"
                      )}>
                        <Icon className={cn("h-6 w-6", program.color)} />
                        <div className="absolute inset-0 bg-gradient-ring rounded-xl opacity-0 group-hover:opacity-20 transition-opacity" />
                      </div>
                      <div className="flex-1">
                        <CyberCardTitle className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                          {program.title}
                        </CyberCardTitle>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {program.description}
                        </p>
                      </div>
                    </div>
                  </CyberCardHeader>
                </CyberCard>
              );
            })}
          </div>
        </div>

        {/* Recent Activity - Cyberpunk Enhanced */}
        <CyberCard 
          variant="glow"
          className="animate-fade-in-scale border-white/10" 
          style={{ animationDelay: "1200ms", animationFillMode: "both" }}
        >
          <CyberCardHeader>
            <CyberCardTitle className="text-lg flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              Recent Activity
            </CyberCardTitle>
          </CyberCardHeader>
          <CyberCardContent>
            <div className="text-center py-12 text-muted-foreground">
              <div className="relative">
                <Gift className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <div className="absolute inset-0 bg-gradient-ring blur-xl opacity-20" />
              </div>
              <p className="font-bold text-lg mb-2">No Activity Yet</p>
              <p className="text-sm">Start trading to see your activity here</p>
              <Button 
                onClick={() => navigate("/app/markets")}
                className="mt-4 bg-gradient-primary border-0 shadow-glow-primary"
              >
                Start Trading
              </Button>
            </div>
          </CyberCardContent>
        </CyberCard>
      </div>
      </div>
    </div>
  );
};

export default AppHomeScreen;