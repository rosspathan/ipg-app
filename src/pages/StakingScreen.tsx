import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, TrendingUp, Lock, Clock } from "lucide-react";

const StakingScreen = () => {
  const navigate = useNavigate();

  const stakingPools = [
    {
      asset: "BTC",
      apy: "5.2%",
      lockTerm: "30 days",
      minAmount: "0.001 BTC",
      capacity: "85%",
      totalStaked: "1,234.56 BTC",
      icon: "₿",
      available: true
    },
    {
      asset: "ETH",
      apy: "7.8%",
      lockTerm: "60 days",
      minAmount: "0.1 ETH",
      capacity: "62%",
      totalStaked: "5,678.90 ETH",
      icon: "Ξ",
      available: true
    },
    {
      asset: "USDT",
      apy: "12.5%",
      lockTerm: "90 days",
      minAmount: "100 USDT",
      capacity: "95%",
      totalStaked: "2.1M USDT",
      icon: "₮",
      available: true
    },
    {
      asset: "USDC",
      apy: "8.3%",
      lockTerm: "45 days",
      minAmount: "100 USDC",
      capacity: "100%",
      totalStaked: "1.8M USDC",
      icon: "©",
      available: false
    }
  ];

  const userStakes = [
    {
      asset: "BTC",
      amount: "0.025",
      apy: "5.2%",
      rewards: "0.00003",
      lockEnds: "Jan 15, 2025",
      status: "Active"
    },
    {
      asset: "ETH",
      amount: "2.5",
      apy: "7.8%",
      rewards: "0.045",
      lockEnds: "Feb 10, 2025",
      status: "Active"
    }
  ];

  const handleStake = (asset: string) => {
    navigate(`/staking-detail/${asset}`);
  };

  const getCapacityColor = (capacity: string) => {
    const percent = parseInt(capacity);
    if (percent >= 95) return "text-red-500";
    if (percent >= 80) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate("/app/home")}
          className="mr-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold">Staking</h1>
      </div>

      <Tabs defaultValue="pools" className="flex-1">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="pools">Staking Pools</TabsTrigger>
          <TabsTrigger value="active">My Stakes</TabsTrigger>
        </TabsList>

        <TabsContent value="pools" className="space-y-4">
          {stakingPools.map((pool) => (
            <Card key={pool.asset} className="bg-gradient-card shadow-card border-0">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-bold">{pool.icon}</span>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{pool.asset} Staking</CardTitle>
                      <p className="text-sm text-muted-foreground">Min: {pool.minAmount}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-500">{pool.apy}</p>
                    <p className="text-xs text-muted-foreground">APY</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{pool.lockTerm}</p>
                      <p className="text-xs text-muted-foreground">Lock Period</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{pool.totalStaked}</p>
                      <p className="text-xs text-muted-foreground">Total Staked</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Capacity:</span>
                    <span className={`text-sm font-medium ${getCapacityColor(pool.capacity)}`}>
                      {pool.capacity}
                    </span>
                  </div>
                  {!pool.available && (
                    <Badge variant="destructive">Pool Full</Badge>
                  )}
                </div>

                <Button 
                  onClick={() => handleStake(pool.asset)}
                  className="w-full"
                  disabled={!pool.available}
                >
                  {pool.available ? "Stake Now" : "Pool Full"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {userStakes.length > 0 ? (
            <>
              {userStakes.map((stake, index) => (
                <Card key={index} className="bg-gradient-card shadow-card border-0">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-primary font-bold">
                            {stakingPools.find(p => p.asset === stake.asset)?.icon}
                          </span>
                        </div>
                        <div>
                          <CardTitle className="text-lg">{stake.amount} {stake.asset}</CardTitle>
                          <p className="text-sm text-muted-foreground">APY: {stake.apy}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        {stake.status}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Rewards Earned</p>
                        <p className="font-medium text-green-600">
                          {stake.rewards} {stake.asset}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Lock Ends</p>
                        <p className="font-medium">{stake.lockEnds}</p>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Clock className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                      <Button size="sm" className="flex-1">
                        Claim Rewards
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              <Card className="bg-gradient-card shadow-card border-0">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Total Staked Value</p>
                  <p className="text-2xl font-bold text-primary">$4,567.89</p>
                  <p className="text-sm text-green-600">+$123.45 rewards pending</p>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="bg-gradient-card shadow-card border-0">
              <CardContent className="p-8 text-center">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No Active Stakes</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start staking to earn passive rewards on your crypto assets
                </p>
                <Button onClick={() => navigate("/app/programs/staking")}>
                  Explore Staking Pools
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StakingScreen;