import * as React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BacklinkBar } from "@/components/programs-pro/BacklinkBar";
import { Coins, Lock, TrendingUp, Clock, ArrowRight, Wallet, History, Info, AlertCircle } from "lucide-react";
import { useNavigation } from "@/hooks/useNavigation";
import { cn } from "@/lib/utils";

// Fixed staking plans as specified
const STAKING_PLANS = [
  {
    id: "starter",
    name: "Starter",
    minAmount: 1,
    monthlyReward: 4,
    lockDays: 30,
    color: "from-blue-500/20 to-blue-600/10",
    borderColor: "border-blue-500/30",
    badgeColor: "bg-blue-500/20 text-blue-400"
  },
  {
    id: "growth",
    name: "Growth",
    minAmount: 5,
    monthlyReward: 6,
    lockDays: 30,
    color: "from-green-500/20 to-green-600/10",
    borderColor: "border-green-500/30",
    badgeColor: "bg-green-500/20 text-green-400"
  },
  {
    id: "premium",
    name: "Premium",
    minAmount: 10,
    monthlyReward: 8,
    lockDays: 30,
    color: "from-purple-500/20 to-purple-600/10",
    borderColor: "border-purple-500/30",
    badgeColor: "bg-purple-500/20 text-purple-400"
  },
  {
    id: "elite",
    name: "Elite",
    minAmount: 15,
    monthlyReward: 10,
    lockDays: 30,
    color: "from-amber-500/20 to-amber-600/10",
    borderColor: "border-amber-500/30",
    badgeColor: "bg-amber-500/20 text-amber-400",
    popular: true
  }
];

const STAKING_FEE = 0.5; // 0.5% entry fee
const UNSTAKING_FEE = 0.5; // 0.5% exit fee

export default function CryptoStakingScreen() {
  const { navigate } = useNavigation();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSelectPlan = (planId: string) => {
    navigate(`/app/staking/${planId}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="px-4 py-6 space-y-6">
        <BacklinkBar programName="Crypto Staking" parentRoute="/app/home" />

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-accent/10 to-background p-6 border border-primary/20">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Coins className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">IPG Staking</h1>
                <p className="text-sm text-muted-foreground">Earn monthly rewards on your IPG</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">4-10%</p>
                <p className="text-xs text-muted-foreground">Monthly</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">30</p>
                <p className="text-xs text-muted-foreground">Days Lock</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">0.5%</p>
                <p className="text-xs text-muted-foreground">Fee</p>
              </div>
            </div>
          </div>
          {/* Background decoration */}
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -left-8 -bottom-8 w-24 h-24 bg-accent/10 rounded-full blur-2xl" />
        </div>

        {/* Info Banner */}
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-foreground font-medium">How it works</p>
              <p className="text-muted-foreground mt-1">
                Transfer IPG from your wallet to your staking account, choose a plan, 
                and earn automatic monthly rewards. Fees: {STAKING_FEE}% on stake, {UNSTAKING_FEE}% on unstake.
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="plans" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="plans" className="text-xs">Plans</TabsTrigger>
            <TabsTrigger value="active" className="text-xs">My Stakes</TabsTrigger>
            <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-4">
            {/* Staking Account Balance Card */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Staking Account</p>
                      <p className="text-xl font-bold text-foreground">0.00 IPG</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => navigate("/app/staking/deposit")}>
                    <ArrowRight className="w-4 h-4 mr-1" />
                    Fund
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Staking Plans */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Choose a Plan</h2>
              {STAKING_PLANS.map((plan) => (
                <Card 
                  key={plan.id}
                  className={cn(
                    "relative overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.02]",
                    `bg-gradient-to-br ${plan.color}`,
                    plan.borderColor,
                    "border"
                  )}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {plan.popular && (
                    <Badge className="absolute top-3 right-3 bg-amber-500 text-black text-[10px]">
                      BEST VALUE
                    </Badge>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{plan.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Min: {plan.minAmount} IPG
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{plan.monthlyReward}%</p>
                        <p className="text-xs text-muted-foreground">Monthly</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Lock className="w-3.5 h-3.5" />
                        <span>{plan.lockDays} days lock</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Auto-compound</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Coins className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">No Active Stakes</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start staking to earn monthly rewards on your IPG tokens
                </p>
                <Button onClick={() => navigate("/app/staking")}>
                  View Staking Plans
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <History className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">No Staking History</h3>
                <p className="text-sm text-muted-foreground">
                  Your staking transactions will appear here
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Fee Disclosure */}
        <Card className="border-muted/30 bg-muted/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Fee Structure</p>
                <p>• Staking Fee: {STAKING_FEE}% deducted at entry</p>
                <p>• Unstaking Fee: {UNSTAKING_FEE}% deducted at withdrawal</p>
                <p>• Rewards are credited automatically each month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
