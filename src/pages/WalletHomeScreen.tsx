import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CyberCard, CyberCardContent, CyberCardHeader, CyberCardTitle } from "@/components/ui/cyber-card";
import { CyberHeader } from "@/components/ui/cyber-header";
import { NeonIconTile } from "@/components/ui/neon-icon-tile";
import { Eye, EyeOff, ArrowUpCircle, ArrowDownCircle, Send, Repeat, Coins, Gift, TrendingUp, Shield, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCatalog } from "@/hooks/useCatalog";
import { useFX } from "@/hooks/useFX";
import BSCWalletInfo from "@/components/BSCWalletInfo";
import AssetLogo from "@/components/AssetLogo";
import CurrencyPicker from "@/components/CurrencyPicker";
import BalanceDisplay from "@/components/BalanceDisplay";
import { cn } from "@/lib/utils";

const WalletHomeScreen = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [showBalances, setShowBalances] = useState(true);
  const { status, assets, error, refetch } = useCatalog();
  const { convert, formatCurrency, displayCurrency } = useFX();

  // Mock user balances - in a real app, this would come from user balance data
  const mockBalances = {
    BTC: { balance: 0.25 },
    ETH: { balance: 5.75 },
    USDT: { balance: 2500.00 },
    BNB: { balance: 15.3 },
    INR: { balance: 50000 },
  };

  // Combine assets with mock balances and convert to display currency
  const userAssets = assets.map(asset => {
    const balance = mockBalances[asset.symbol as keyof typeof mockBalances]?.balance ?? 0;
    const valueInDisplayCurrency = convert(balance, asset.symbol, displayCurrency);
    
    return {
      ...asset,
      balance,
      displayValue: valueInDisplayCurrency,
    };
  });

  const totalBalance = userAssets.reduce((sum, asset) => sum + (asset.displayValue || 0), 0);

  // Quick actions with cyberpunk styling
  const actions = [
    { name: "Deposit", icon: ArrowDownCircle, color: "text-success", route: "/app/wallet/deposit", glow: "strong" as const },
    { name: "Withdraw", icon: ArrowUpCircle, color: "text-danger", route: "/app/wallet/withdraw" },
    { name: "Swap", icon: Repeat, color: "text-secondary", route: "/app/swap" },
    { name: "Send", icon: Send, color: "text-warning", route: "/app/wallet/send" },
    { name: "Trade", icon: TrendingUp, color: "text-primary", route: "/app/trade" },
    { name: "Staking", icon: Coins, color: "text-accent", route: "/app/programs/staking" },
    { name: "Programs", icon: Gift, color: "text-primary", route: "/app/programs" },
    ...(isAdmin ? [{ name: "Admin", icon: Shield, color: "text-danger", route: "/admin" }] : []),
  ];

  const kpis = [
    { label: "24h P&L", value: "+5.67%", delta: 5.67, variant: "success" as const },
    { label: "Assets", value: userAssets.length },
    { label: "Network", value: "BSC" },
  ];

  // Show loading only for the first few seconds, then show content regardless
  const showLoading = status === 'loading';
  const showError = status === 'error';

  return (
    <div className="min-h-screen bg-background w-full animate-slide-in-right">
      {/* Loading Overlay */}
      {showLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <CyberCard variant="glow" className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your assets...</p>
            </div>
          </CyberCard>
        </div>
      )}

      {/* Error Banner */}
      {showError && (
        <div className="p-4">
          <CyberCard className="border-danger/30 bg-danger/5">
            <CyberCardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-danger">Unable to Load Assets</h4>
                  <p className="text-sm text-danger/80">{error}</p>
                </div>
                <Button onClick={refetch} size="sm" variant="outline">
                  Retry
                </Button>
              </div>
            </CyberCardContent>
          </CyberCard>
        </div>
      )}

      {/* Cyber Header */}
      <CyberHeader
        title="My Wallet"
        subtitle="Manage your digital assets"
        kpis={kpis}
        actions={<CurrencyPicker />}
      />

      <div className="p-4 space-y-6">
        {/* BSC Wallet Info */}
        <BSCWalletInfo />

        {/* Total Balance Card */}
        <BalanceDisplay
          balance={totalBalance}
          change24h={2.4}
          onAddFunds={() => navigate("/app/wallet/deposit")}
          className="animate-fade-in-scale"
          style={{ animationDelay: "200ms", animationFillMode: "both" }}
        />

        {/* Quick Actions - Cyberpunk Grid */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground tracking-tight">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-3">
            {actions.map((action, index) => (
              <NeonIconTile
                key={action.name}
                icon={action.icon}
                label={action.name}
                variant={index === 0 ? "primary" : "default"}
                glow={action.glow || "none"}
                onClick={() => navigate(action.route)}
                className={cn(
                  "animate-slide-up-stagger",
                  action.color
                )}
                style={{ 
                  animationDelay: `${400 + index * 50}ms`,
                  animationFillMode: "both"
                }}
              />
            ))}
          </div>
        </div>

        {/* Assets List */}
        <CyberCard variant="elevated" className="animate-fade-in-scale" style={{ animationDelay: "800ms", animationFillMode: "both" }}>
          <CyberCardHeader>
            <div className="flex items-center justify-between">
              <CyberCardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                My Assets
              </CyberCardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBalances(!showBalances)}
                className="hover:bg-primary/10 hover:text-primary"
              >
                {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </CyberCardHeader>
          <CyberCardContent className="space-y-3">
            {userAssets.length > 0 ? (
              userAssets.map((asset, index) => (
                <div 
                  key={asset.id} 
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl",
                    "bg-card-glass backdrop-blur-[14px] border border-white/10",
                    "hover:bg-card-glass hover:border-primary/30 hover:shadow-glow-primary",
                    "transition-all duration-normal cursor-pointer",
                    "animate-slide-up-stagger group"
                  )}
                  style={{ 
                    animationDelay: `${1000 + index * 100}ms`,
                    animationFillMode: "both"
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <AssetLogo symbol={asset.symbol} logoUrl={asset.logo_url} />
                      <div className="absolute -inset-1 bg-gradient-ring rounded-full opacity-0 group-hover:opacity-30 transition-opacity" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground">{asset.symbol}</div>
                      <div className="text-sm text-muted-foreground">{asset.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-foreground tabular-nums">
                      {showBalances ? asset.balance.toFixed(4) : "••••"} {asset.symbol}
                    </div>
                    <div className="text-sm text-muted-foreground tabular-nums">
                      {showBalances ? formatCurrency(asset.displayValue) : "••••"}
                    </div>
                  </div>
                </div>
              ))
            ) : assets.length === 0 && status === 'ready' ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="relative">
                  <Coins className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <div className="absolute inset-0 bg-gradient-ring blur-xl opacity-20" />
                </div>
                <p className="font-bold text-lg mb-2">No Assets Available</p>
                <p className="text-sm mb-4">Assets will appear here once configured</p>
                {isAdmin && (
                  <Button 
                    onClick={() => navigate('/admin/assets')} 
                    className="mt-4 bg-gradient-primary border-0"
                    variant="outline"
                  >
                    Add Assets in Admin
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <div className="relative">
                  <Coins className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <div className="absolute inset-0 bg-gradient-ring blur-xl opacity-20" />
                </div>
                <p className="font-bold text-lg mb-2">No Balance Found</p>
                <p className="text-sm">Your assets will appear here once you have a balance</p>
              </div>
            )}
          </CyberCardContent>
        </CyberCard>
      </div>
    </div>
  );
};

export default WalletHomeScreen;