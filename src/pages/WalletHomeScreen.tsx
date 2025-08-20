import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, ArrowUpCircle, ArrowDownCircle, Send, MoreHorizontal, Repeat, Coins, Gift, TrendingUp, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import BSCWalletInfo from "@/components/BSCWalletInfo";

const WalletHomeScreen = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [showBalances, setShowBalances] = useState(true);

  // Mock asset data
  const assets = [
    { symbol: "BTC", name: "Bitcoin", balance: 0.25, fiatValue: 12500.00, icon: "₿" },
    { symbol: "ETH", name: "Ethereum", balance: 5.75, fiatValue: 10230.50, icon: "Ξ" },
    { symbol: "USDT", name: "Tether", balance: 2500.00, fiatValue: 2500.00, icon: "₮" },
    { symbol: "BNB", name: "Binance Coin", balance: 15.3, fiatValue: 4590.00, icon: "Ⓑ" },
  ];

  const totalBalance = assets.reduce((sum, asset) => sum + asset.fiatValue, 0);

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
          {assets.map((asset, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center space-x-3">
                <div className="text-2xl font-bold">{asset.icon}</div>
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
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default WalletHomeScreen;