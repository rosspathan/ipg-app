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

  // Combine assets with mock balances; include all assets (default to 0)
  const userAssets = assets.map(asset => ({
    ...asset,
    balance: mockBalances[asset.symbol as keyof typeof mockBalances]?.balance ?? 0,
    fiatValue: mockBalances[asset.symbol as keyof typeof mockBalances]?.fiatValue ?? 0,
  }));

  const totalBalance = userAssets.reduce((sum, asset) => sum + (asset.fiatValue || 0), 0);

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

  // Show loading only for the first few seconds, then show content regardless
  const showLoading = status === 'loading';
  const showError = status === 'error';

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Loading Overlay */}
      {showLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your assets...</p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {showError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-red-800">Unable to Load Assets</h4>
                <p className="text-sm text-red-600">{error}</p>
              </div>
              <Button onClick={refetch} size="sm" variant="outline">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
        </CardContent>
      </Card>
    </div>
  );
};

export default WalletHomeScreen;