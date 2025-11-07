import { useNavigate } from "react-router-dom";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CyberCard, CyberCardContent, CyberCardHeader, CyberCardTitle } from "@/components/ui/cyber-card";
import { CyberHeader } from "@/components/ui/cyber-header";
import BalanceDisplay from "@/components/BalanceDisplay";
import { UnifiedTransactionFeed } from "@/components/UnifiedTransactionFeed";
import { AnnouncementTicker } from "@/components/AnnouncementTicker";
import QuickActionGrid from "@/components/QuickActionGrid";
import BonusBalanceCard from "@/components/BonusBalanceCard";
import { BSKBalanceCard } from "@/components/BSKBalanceCard";
import { BSKPromotionBanner } from '@/components/BSKPromotionBanner';
import { AdCarousel } from "@/components/AdCarousel";
import InsuranceCard from "@/components/InsuranceCard";
import BSKLoanCard from "@/components/BSKLoanCard";
import { Bell, Star, Zap, Activity, Users, Gift, Coins, TrendingUp, Gamepad2, Plus, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/utils/clipboard";
import { cn } from "@/lib/utils";
import ipgLogo from "@/assets/ipg-logo.jpg";
import { SupportLinkWhatsApp } from "@/components/support/SupportLinkWhatsApp";
import CurvedBottomNav from "@/components/CurvedBottomNav";

const AppHomeScreen = () => {
  console.log('AppHomeScreen: Component rendering...');
  
  const navigate = useNavigate();
  const { user } = useAuthUser();

  console.log('AppHomeScreen: User authenticated:', !!user);

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
    { name: "Trading", icon: TrendingUp, variant: "secondary" as const, route: "/app/trade", badge: "LIVE" },
    { name: "Games", icon: Gamepad2, variant: "default" as const, route: "/app/spin", badge: "NEW" },
    { name: "Profile", icon: Users, variant: "default" as const, route: "/app/profile" },
    { name: "History", icon: Activity, variant: "default" as const, route: "/app/history" },
    { name: "Support", icon: Bell, variant: "default" as const, route: "/app/support" },
    { name: "Markets", icon: Star, variant: "default" as const, route: "/app/markets" },
  ];

  const featuredPrograms = [
    {
      title: "Advertising Mining",
      description: "Watch ads and earn BSK rewards with subscriptions",
      icon: Gift,
      color: "text-accent",
      action: () => navigate("/app-legacy/programs/advertising"),
      gradient: "from-accent/20 to-warning/20",
      badge: "EARN"
    },
    {
      title: "Lucky Draw",
      description: "Join pool-based lottery draws to win big prizes",
      icon: Gift,
      color: "text-warning",
      action: () => navigate("/app-legacy/lucky"),
      gradient: "from-warning/20 to-danger/20",
      badge: "WIN"
    },
    {
      title: "Staking Rewards",
      description: "Earn 12.4% APY on your crypto holdings",
      icon: Star,
      color: "text-warning",
      action: () => navigate("/app-legacy/programs/staking"),
      gradient: "from-warning/20 to-primary/20",
      badge: "HOT"
    },
    {
      title: "BSK Fortune Wheel",
      description: "Spin to win or lose BSK Coins! Futuristic wheel with premium design", 
      icon: Zap,
      color: "text-primary", 
      action: () => navigate("/app-legacy/spin"),
      gradient: "from-primary/20 to-secondary/20",
      badge: "DAILY"
    },
    {
      title: "Trading",
      description: "Real-time market data & advanced tools",
      icon: Activity,
      color: "text-success",
      action: () => navigate("/app-legacy/trade"),
      gradient: "from-success/20 to-accent/20",
      badge: "LIVE"
    },
    {
      title: "Referral Program",
      description: "Earn with friends & grow your network", 
      icon: Users,
      color: "text-secondary",
      action: () => navigate("/app-legacy/programs/referrals"),
      gradient: "from-secondary/20 to-primary/20"
    }
  ];

  const handleAddFunds = () => {
    navigate("/app-legacy/wallet/deposit");
  };

  const handleCopyAddress = async () => {
    // Mock wallet address
    const address = "0x742d35Cc6135C5C8C91b8f54534d7134E6faE9A2";
    const success = await copyToClipboard(address);
    
    if (success) {
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to copy address",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen w-full">
      {/* Announcement Ticker at Top */}
      <AnnouncementTicker />

      {/* Content */}
      <div>
        {/* Cyber Header with KPIs */}
        <CyberHeader
          title="IPG I-SMART"
          subtitle="Welcome back to your digital future"
          logo={ipgLogo}
          kpis={kpis}
          actions={
            <div className="flex items-center gap-3">
              <SupportLinkWhatsApp variant="inline" />
              <Button
                variant="ghost" 
                size="sm"
                className="relative p-2 hover:bg-primary/10"
                onClick={() => navigate("/app/notifications")}
              >
                <Bell className="h-5 w-5" />
                
              </Button>
              <Badge variant="secondary" className="bg-card-glass border-primary/20 text-primary font-bold px-3">
                {user?.email?.split('@')[0]}
              </Badge>
            </div>
          }
        />

      <div className="p-3 space-y-4 md:p-4 md:space-y-6 pb-28">
        {/* Premium Add Funds Button - simplified (no animations) */}
        <div className="relative group">
          <Button
            onClick={handleAddFunds}
            size="lg"
            className={cn(
              "w-full h-16 relative overflow-hidden",
              "bg-gradient-to-r from-primary via-accent to-primary",
              "border-2 border-primary/30",
              "font-bold text-base tracking-wide"
            )}
          >
            <div className="relative z-10 flex items-center justify-center gap-3">
              <Plus className="relative h-6 w-6" />
              <span className="text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">Add Funds</span>
              <div className="ml-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-xs font-medium">Instant</div>
            </div>
          </Button>
        </div>

        {/* Balance Display - Now Connected to Real Data */}
        <BalanceDisplay onAddFunds={handleAddFunds} />

        {/* Promotional Banner - 0% interest loan */}
        <div 
          onClick={() => navigate("/app-legacy/loans")}
          className="relative rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 p-4 cursor-pointer hover:border-primary/50 overflow-hidden"
        >
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground leading-snug">
                0% interest for 16 weeks on amounts up to ₹50,000
              </p>
            </div>
            <div className="shrink-0 px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/30">
              <span className="text-xs font-bold text-primary tracking-wide">Trading</span>
            </div>
          </div>
        </div>

        {/* BSK Promotion Banner */}
        <BSKPromotionBanner />

        {/* Insurance Card */}
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-foreground tracking-tight">Insurance</h3>
          <InsuranceCard 
            variant="compact"
            className="border-2 border-primary/30"
          />
        </div>

        {/* BSK Loan Card */}
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-foreground tracking-tight">BSK Loans</h3>
          <BSKLoanCard 
            variant="compact"
          />
        </div>

        {/* BSK Balances Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground tracking-tight">BSK Balances</h3>
          <div className="grid gap-4">
            <BSKBalanceCard 
              balanceType="withdrawable"
            />
            <BSKBalanceCard 
              balanceType="holding"
            />
          </div>
        </div>

        {/* Legacy Bonus Balance Card */}
        <BonusBalanceCard />

        {/* Ad Banner */}
        <AdCarousel 
          placement="home_top" 
        />

        {/* Featured Programs */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground tracking-tight">Featured Programs</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {featuredPrograms.map((program) => {
              const Icon = program.icon;
              return (
                <CyberCard
                  key={program.title}
                  variant="elevated"
                  className={cn(
                    "cursor-pointer group relative overflow-hidden",
                    "bg-gradient-to-br border-white/10 hover:border-primary/30",
                    program.gradient
                  )}
                  onClick={program.action}
                >
                  {program.badge && (
                    <div className="absolute top-3 right-3 z-10">
                      <Badge className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1">
                        {program.badge}
                      </Badge>
                    </div>
                  )}
                  
                  <CyberCardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "relative p-3 rounded-xl bg-card-glass backdrop-blur-[14px]",
                        "border border-white/20"
                      )}>
                        <Icon className={cn("h-6 w-6", program.color)} />
                      </div>
                      <div className="flex-1">
                        <CyberCardTitle className="text-base font-bold text-foreground">
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

        {/* Unified Transaction Feed - Real Data */}
        <UnifiedTransactionFeed />
      </div>
      </div>

      {/* Bottom Navigation with Radial Speed Dial */}
      <CurvedBottomNav />
    </div>
  );
};

export default AppHomeScreen;