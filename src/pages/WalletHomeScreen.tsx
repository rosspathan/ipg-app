import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { Eye, EyeOff, ArrowUpCircle, ArrowDownCircle, Send, MoreHorizontal, Repeat, Coins, Gift, TrendingUp, Shield } from "lucide-react";
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

  // Quick actions with swap included
  const actions = [
    { name: "Deposit", icon: ArrowDownCircle, color: "text-green-400", route: "/app/wallet/deposit" },
    { name: "Withdraw", icon: ArrowUpCircle, color: "text-red-400", route: "/app/wallet/withdraw" },
    { name: "Swap", icon: Repeat, color: "text-blue-400", route: "/app/swap" },
    { name: "Send", icon: Send, color: "text-orange-400", route: "/app/wallet/send" },
    { name: "Trade", icon: TrendingUp, color: "text-indigo-400", route: "/app/trade" },
    { name: "Staking", icon: Coins, color: "text-yellow-400", route: "/app/programs/staking" },
    { name: "Programs", icon: Gift, color: "text-purple-400", route: "/app/programs" },
    ...(isAdmin ? [{ name: "Admin", icon: Shield, color: "text-red-400", route: "/admin" }] : []),
  ];

  // Show loading only for the first few seconds, then show content regardless
  const showLoading = status === 'loading';
  const showError = status === 'error';

  return (
    <div className="min-h-screen bg-background p-4 space-y-6 animate-slide-in-right">
      {/* Loading Overlay */}
      {showLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <GlassCard className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your assets...</p>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Error Banner */}
      {showError && (
        <GlassCard variant="destructive" className="border-destructive/30">
          <GlassCardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-destructive-foreground">Unable to Load Assets</h4>
                <p className="text-sm text-destructive-foreground/80">{error}</p>
              </div>
              <Button onClick={refetch} size="sm" variant="outline">
                Retry
              </Button>
            </div>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-neon bg-clip-text text-transparent">My Wallet</h1>
          <p className="text-muted-foreground">Manage your digital assets</p>
        </div>
        <CurrencyPicker />
      </div>

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

      {/* Quick Actions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground/90">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-3">
          {actions.map((action, index) => (
            <GlassCard
              key={action.name}
              hover="glow"
              className={cn(
                "p-0 cursor-pointer border-border/30",
                "animate-fade-in-scale"
              )}
              style={{ 
                animationDelay: `${400 + index * 50}ms`,
                animationFillMode: "both"
              }}
              onClick={() => navigate(action.route)}
            >
              <GlassCardContent className="p-4 flex flex-col items-center gap-2">
                <div className="ripple rounded-full p-3 bg-background/20 border border-border/30">
                  <action.icon className={cn("h-5 w-5", action.color)} />
                </div>
                <span className="text-xs font-medium text-center text-foreground/80 leading-tight">
                  {action.name}
                </span>
              </GlassCardContent>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Assets List */}
      <GlassCard className="animate-fade-in-scale border-border/30" style={{ animationDelay: "800ms", animationFillMode: "both" }}>
        <GlassCardHeader>
          <div className="flex items-center justify-between">
            <GlassCardTitle className="text-lg">My Assets</GlassCardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBalances(!showBalances)}
              className="hover:bg-background/20"
            >
              {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          {userAssets.length > 0 ? (
            userAssets.map((asset, index) => (
              <div 
                key={asset.id} 
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg",
                  "bg-background/20 border border-border/30",
                  "hover:bg-background/30 transition-all duration-normal",
                  "animate-fade-in-scale"
                )}
                style={{ 
                  animationDelay: `${1000 + index * 100}ms`,
                  animationFillMode: "both"
                }}
              >
                <div className="flex items-center space-x-3">
                  <AssetLogo symbol={asset.symbol} logoUrl={asset.logo_url} />
                  <div>
                    <div className="font-medium text-foreground">{asset.symbol}</div>
                    <div className="text-sm text-muted-foreground">{asset.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-foreground">
                    {showBalances ? asset.balance.toFixed(4) : "****"} {asset.symbol}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {showBalances ? formatCurrency(asset.displayValue) : "****"}
                  </div>
                </div>
              </div>
            ))
          ) : assets.length === 0 && status === 'ready' ? (
            <div className="text-center py-8 text-muted-foreground">
              <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No Assets Available</p>
              <p className="text-sm">Assets will appear here once configured</p>
              {isAdmin && (
                <Button 
                  onClick={() => navigate('/admin/assets')} 
                  className="mt-4"
                  variant="outline"
                >
                  Add Assets in Admin
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No assets with balance found</p>
              <p className="text-sm">Your assets will appear here once you have a balance</p>
            </div>
          )}
        </GlassCardContent>
      </GlassCard>
    </div>
  );
};

export default WalletHomeScreen;