import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, ArrowUpCircle, ArrowDownCircle, Send, MoreHorizontal, Repeat, Coins, Gift, TrendingUp, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCatalog } from "@/hooks/useCatalog";
import BSCWalletInfo from "@/components/BSCWalletInfo";
import AssetLogo from "@/components/AssetLogo";

const WalletHomeScreen = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [showBalances, setShowBalances] = useState(true);
  const { status, assets, error, refetch } = useCatalog();

  // Mock user balances - in a real app, this would come from user balance data
  const mockBalances = {
    BTC: { balance: 0.25, fiatValue: 12500.00 },
    ETH: { balance: 5.75, fiatValue: 10230.50 },
    USDT: { balance: 2500.00, fiatValue: 2500.00 },
    BNB: { balance: 15.3, fiatValue: 4590.00 },
  };

  // Combine assets with mock balances
  const userAssets = assets.map(asset => ({
    ...asset,
    balance: mockBalances[asset.symbol as keyof typeof mockBalances]?.balance || 0,
    fiatValue: mockBalances[asset.symbol as keyof typeof mockBalances]?.fiatValue || 0,
  })).filter(asset => asset.balance > 0);

  const totalBalance = userAssets.reduce((sum, asset) => sum + asset.fiatValue, 0);

  // Quick actions
  const actions = [
    { name: "Deposit", icon: ArrowDownCircle, color: "text-green-600", route: "/deposit" },
    { name: "Withdraw", icon: ArrowUpCircle, color: "text-red-600", route: "/withdraw" },
    { name: "Send", icon: Send, color: "text-blue-600", route: "/send" },
    { name: "Transfer", icon: Repeat, color: "text-orange-600", route: "/transfer" },
    { name: "Trade", icon: TrendingUp, color: "text-indigo-600", route: "/trading" },
    { name: "Staking", icon: Coins, color: "text-yellow-600", route: "/staking" },
    { name: "Programs", icon: Gift, color: "text-purple-600", route: "/programs" },
    ...(isAdmin ? [{ name: "Admin", icon: Shield, color: "text-red-600", route: "/admin" }] : []),
    { name: "More", icon: MoreHorizontal, color: "text-gray-600", route: "/more" },
  ];

  // Handle different loading states
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background p-4 space-y-6">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your assets...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-background p-4 space-y-6">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="text-red-600">
                  <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold">Unable to Load Assets</h3>
                <p className="text-muted-foreground text-sm">{error}</p>
                {error?.includes('Permission denied') && (
                  <div className="text-xs text-muted-foreground p-3 bg-muted rounded border-l-4 border-yellow-500">
                    <strong>Developer note:</strong> Enable a read policy on assets table:<br/>
                    <code>CREATE POLICY read_assets ON public.assets FOR SELECT USING (is_active = true);</code>
                  </div>
                )}
                <Button onClick={refetch} className="w-full">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (status === 'empty') {
    return (
      <div className="min-h-screen bg-background p-4 space-y-6">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="text-muted-foreground">
                  <Coins className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold">No Assets Configured</h3>
                <p className="text-muted-foreground text-sm">
                  No assets are available yet. Assets will appear here once they're added to the system.
                </p>
                {isAdmin && (
                  <Button onClick={() => navigate('/admin/assets')} className="w-full">
                    Add Assets in Admin Panel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Wallet</h1>
          <p className="text-muted-foreground">Manage your digital assets</p>
        </div>
      </div>

      {/* BSC Wallet Info */}
      <BSCWalletInfo />

      {/* Total Balance Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Total Balance</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBalances(!showBalances)}
            >
              {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {showBalances ? `$${totalBalance.toLocaleString()}` : "****"}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            ≈ {showBalances ? `$${totalBalance.toLocaleString()}` : "****"} USD
          </p>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-4">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant="outline"
            className="h-20 flex flex-col items-center justify-center space-y-2"
            onClick={() => navigate(action.route)}
          >
            <action.icon className={`h-6 w-6 ${action.color}`} />
            <span className="text-xs">{action.name}</span>
          </Button>
        ))}
      </div>

      {/* Assets List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>My Assets</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBalances(!showBalances)}
            >
              {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {userAssets.length > 0 ? (
            userAssets.map((asset) => (
              <div key={asset.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <AssetLogo symbol={asset.symbol} logoUrl={asset.logo_url} />
                  <div>
                    <div className="font-medium">{asset.symbol}</div>
                    <div className="text-sm text-muted-foreground">{asset.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {showBalances ? asset.balance.toFixed(4) : "****"} {asset.symbol}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {showBalances ? `$${asset.fiatValue.toLocaleString()}` : "****"}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No assets with balance found</p>
              <p className="text-sm">Your assets will appear here once you have a balance</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WalletHomeScreen;