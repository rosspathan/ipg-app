import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, Send, ArrowRightLeft, History, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

const WalletHomeScreen = () => {
  const navigate = useNavigate();
  const [showBalances, setShowBalances] = useState(true);

  const assets = [
    { symbol: "BTC", name: "Bitcoin", balance: "0.00234567", fiatValue: "$156.78", icon: "₿" },
    { symbol: "ETH", name: "Ethereum", balance: "1.45", fiatValue: "$4,250.30", icon: "Ξ" },
    { symbol: "USDT", name: "Tether", balance: "1,250.00", fiatValue: "$1,250.00", icon: "₮" },
    { symbol: "USDC", name: "USD Coin", balance: "500.00", fiatValue: "$500.00", icon: "©" }
  ];

  const totalBalance = "$6,157.08";

  const actions = [
    { name: "Deposit", icon: ArrowDown, color: "text-green-600", route: "/deposit" },
    { name: "Withdraw", icon: ArrowUp, color: "text-red-600", route: "/withdraw" },
    { name: "Send", icon: Send, color: "text-blue-600", route: "/send" },
    { name: "Transfer", icon: ArrowRightLeft, color: "text-purple-600", route: "/transfer" },
    { name: "History", icon: History, color: "text-gray-600", route: "/history" }
  ];

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-sm mx-auto w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Wallet</h1>
          <div className="flex items-center justify-center space-x-2">
            <p className="text-sm text-muted-foreground">Total Balance</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBalances(!showBalances)}
              className="p-1 h-auto"
            >
              {showBalances ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-3xl font-bold text-primary">
            {showBalances ? totalBalance : "••••••"}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-5 gap-4">
          {actions.map((action, index) => (
            <div key={index} className="text-center">
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate(action.route)}
                className="w-full h-16 flex flex-col space-y-1 p-2"
              >
                <action.icon className={`w-5 h-5 ${action.color}`} />
              </Button>
              <p className="text-xs text-muted-foreground mt-2">{action.name}</p>
            </div>
          ))}
        </div>

        {/* Assets List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Assets</h2>
          {assets.map((asset, index) => (
            <Card key={index} className="bg-gradient-card shadow-card border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-bold">{asset.icon}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-card-foreground">{asset.symbol}</p>
                      <p className="text-sm text-muted-foreground">{asset.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-card-foreground">
                      {showBalances ? asset.balance : "••••••"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {showBalances ? asset.fiatValue : "••••••"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WalletHomeScreen;