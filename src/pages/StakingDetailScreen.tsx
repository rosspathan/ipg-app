import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, AlertTriangle, TrendingUp, Lock, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const StakingDetailScreen = () => {
  const navigate = useNavigate();
  const { asset } = useParams<{ asset: string }>();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");

  // Mock pool data based on asset
  const poolData = {
    BTC: { apy: "5.2%", lockTerm: "30 days", minAmount: "0.001", icon: "₿", balance: "0.1234" },
    ETH: { apy: "7.8%", lockTerm: "60 days", minAmount: "0.1", icon: "Ξ", balance: "2.5678" },
    USDT: { apy: "12.5%", lockTerm: "90 days", minAmount: "100", icon: "₮", balance: "1250.00" },
    USDC: { apy: "8.3%", lockTerm: "45 days", minAmount: "100", icon: "©", balance: "500.00" }
  };

  const pool = poolData[asset as keyof typeof poolData] || poolData.BTC;
  const currentAsset = asset || "BTC";

  const calculateRewards = () => {
    if (!amount) return "0";
    const principal = parseFloat(amount);
    const apyPercent = parseFloat(pool.apy.replace('%', ''));
    const lockDays = parseInt(pool.lockTerm.split(' ')[0]);
    const dailyRate = apyPercent / 365 / 100;
    const totalRewards = principal * dailyRate * lockDays;
    return totalRewards.toFixed(6);
  };

  const handleStake = () => {
    if (!amount) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid staking amount",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(amount) < parseFloat(pool.minAmount)) {
      toast({
        title: "Amount Too Low",
        description: `Minimum staking amount is ${pool.minAmount} ${currentAsset}`,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Staking Successful!",
      description: `Successfully staked ${amount} ${currentAsset}`,
    });

    setTimeout(() => {
      navigate("/app/staking");
    }, 2000);
  };

  const handleMaxAmount = () => {
    setAmount(pool.balance);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
          className="mr-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold">Stake {currentAsset}</h1>
      </div>

      {/* Pool Info */}
      <Card className="bg-gradient-card shadow-card border-0 mb-6">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-primary font-bold text-xl">{pool.icon}</span>
            </div>
            <div>
              <CardTitle className="text-xl">{currentAsset} Staking Pool</CardTitle>
              <p className="text-sm text-muted-foreground">Earn rewards on your {currentAsset}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-500">{pool.apy}</p>
                <p className="text-xs text-muted-foreground">Annual APY</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-lg font-semibold">{pool.lockTerm}</p>
                <p className="text-xs text-muted-foreground">Lock Period</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staking Form */}
      <Card className="bg-gradient-card shadow-card border-0 mb-6">
        <CardHeader>
          <CardTitle className="text-base">Stake Amount</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Amount to Stake</Label>
              <span className="text-sm text-muted-foreground">
                Balance: {pool.balance} {currentAsset}
              </span>
            </div>
            <div className="flex space-x-2">
              <Input
                type="number"
                placeholder={`Min: ${pool.minAmount}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" onClick={handleMaxAmount}>
                Max
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum staking amount: {pool.minAmount} {currentAsset}
            </p>
          </div>

          {amount && (
            <Card className="bg-muted/20 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <h4 className="font-medium text-sm">Estimated Rewards</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Staking Amount:</span>
                    <span>{amount} {currentAsset}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Lock Period:</span>
                    <span>{pool.lockTerm}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>APY:</span>
                    <span>{pool.apy}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium border-t border-border pt-2">
                    <span>Expected Rewards:</span>
                    <span className="text-green-600">
                      {calculateRewards()} {currentAsset}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Warning */}
      <Card className="bg-yellow-50 border-yellow-200 mb-6">
        <CardContent className="p-4">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-yellow-800">Important Notice</p>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li>• Your assets will be locked for {pool.lockTerm}</li>
                <li>• Early withdrawal may result in penalty fees</li>
                <li>• Rewards are calculated daily and paid at maturity</li>
                <li>• APY is subject to market conditions</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stake Button */}
      <Button 
        onClick={handleStake}
        size="lg"
        className="w-full"
        disabled={!amount || parseFloat(amount) < parseFloat(pool.minAmount)}
      >
        <Lock className="w-4 h-4 mr-2" />
        Stake {currentAsset}
      </Button>
    </div>
  );
};

export default StakingDetailScreen;