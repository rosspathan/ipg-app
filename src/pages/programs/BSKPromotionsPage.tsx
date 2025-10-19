import { useState } from "react";
import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate";
import { ProgramAccessGate } from "@/components/programs/ProgramAccessGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Gift, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2,
  Calendar,
  DollarSign,
  Wallet,
  History
} from "lucide-react";
import { useBSKPromotion } from "@/hooks/useBSKPromotion";
import { format } from "date-fns";

export default function BSKPromotionsPage() {
  return (
    <ProgramAccessGate programKey="one_time_bsk" title="BSK Promotions">
      <BSKPromotionsContent />
    </ProgramAccessGate>
  );
}

function BSKPromotionsContent() {
  const {
    activeCampaign,
    userClaim,
    bonusHistory,
    loading,
    processing,
    checkEligibility,
    calculateExpectedBonus,
    getUserStatus,
    getTimeRemaining
  } = useBSKPromotion();

  const [purchaseAmount, setPurchaseAmount] = useState<string>("");
  const userStatus = getUserStatus();
  const timeRemaining = getTimeRemaining();

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimals
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setPurchaseAmount(value);
    }
  };

  const eligibility = purchaseAmount 
    ? checkEligibility(parseFloat(purchaseAmount)) 
    : null;

  const expectedBonus = purchaseAmount 
    ? calculateExpectedBonus(parseFloat(purchaseAmount))
    : 0;

  if (loading) {
    return (
      <ProgramPageTemplate title="BSK Promotions" subtitle="Loading campaign details...">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </ProgramPageTemplate>
    );
  }

  if (!activeCampaign) {
    return (
      <ProgramPageTemplate title="BSK Promotions" subtitle="No active campaigns">
        <Card>
          <CardContent className="pt-6 text-center">
            <Gift className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Active Promotions</h3>
            <p className="text-muted-foreground">
              Check back soon for exclusive BSK bonus campaigns
            </p>
          </CardContent>
        </Card>
      </ProgramPageTemplate>
    );
  }

  const budgetUsedPercent = activeCampaign.global_budget_bsk 
    ? (activeCampaign.global_budget_used_bsk / activeCampaign.global_budget_bsk) * 100
    : 0;

  const effectivePurchase = purchaseAmount 
    ? Math.min(parseFloat(purchaseAmount), activeCampaign.max_purchase_inr)
    : 0;

  return (
    <ProgramPageTemplate
      title="BSK Promotions"
      subtitle="Purchase BSK and get instant bonus rewards"
    >
      <div className="space-y-6">
        {/* Active Campaign Banner */}
        <Card className="border-2 border-primary/50 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary/20">
                  <Gift className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{activeCampaign.name}</CardTitle>
                  <CardDescription className="text-base mt-1">
                    Get <span className="font-bold text-primary">{activeCampaign.bonus_percent}% Bonus BSK</span> on every purchase
                  </CardDescription>
                </div>
              </div>
              
              {userStatus === 'claimed' && (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Claimed
                </Badge>
              )}

              {userStatus === 'eligible' && (
                <Badge variant="default" className="gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Active
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Campaign Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Min Purchase</p>
                <p className="text-lg font-semibold">₹{activeCampaign.min_purchase_inr.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Max Purchase</p>
                <p className="text-lg font-semibold">₹{activeCampaign.max_purchase_inr.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Bonus</p>
                <p className="text-lg font-semibold text-primary">{activeCampaign.bonus_percent}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Destination</p>
                <p className="text-lg font-semibold capitalize">{activeCampaign.destination}</p>
              </div>
            </div>

            <Separator />

            {/* Time Remaining */}
            {timeRemaining && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Ends in:</span>
                <span className="font-semibold">
                  {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m
                </span>
              </div>
            )}

            {/* Budget Progress */}
            {activeCampaign.global_budget_bsk && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Campaign Budget</span>
                  <span className="font-medium">
                    {activeCampaign.global_budget_used_bsk.toFixed(0)} / {activeCampaign.global_budget_bsk.toFixed(0)} BSK
                  </span>
                </div>
                <Progress value={budgetUsedPercent} className="h-2" />
              </div>
            )}

            {/* Vesting Info */}
            {activeCampaign.vesting_enabled && (
              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertDescription>
                  Bonus BSK will vest over <strong>{activeCampaign.vesting_duration_days} days</strong>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Purchase Form */}
        {userStatus !== 'claimed' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Purchase BSK & Get Bonus
              </CardTitle>
              <CardDescription>
                Enter your purchase amount to calculate bonus
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="purchase-amount">Purchase Amount (INR)</Label>
                <Input
                  id="purchase-amount"
                  type="text"
                  placeholder="Enter amount"
                  value={purchaseAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Range: ₹{activeCampaign.min_purchase_inr.toLocaleString()} - ₹{activeCampaign.max_purchase_inr.toLocaleString()}
                </p>
              </div>

              {/* Real-time Calculation */}
              {purchaseAmount && parseFloat(purchaseAmount) > 0 && (
                <div className="rounded-lg bg-muted p-4 space-y-3">
                  <h4 className="font-semibold text-sm">Bonus Calculation</h4>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Purchase Amount</span>
                      <span className="font-medium">₹{parseFloat(purchaseAmount).toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Effective Amount (capped)</span>
                      <span className="font-medium">₹{effectivePurchase.toLocaleString()}</span>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">BSK Rate</span>
                      <span className="font-medium">₹{activeCampaign.rate_snapshot_bsk_inr}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base BSK</span>
                      <span className="font-medium">
                        {(effectivePurchase / activeCampaign.rate_snapshot_bsk_inr).toFixed(2)} BSK
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-primary">
                      <span className="font-semibold">Bonus BSK ({activeCampaign.bonus_percent}%)</span>
                      <span className="font-bold text-lg">+{expectedBonus.toFixed(2)} BSK</span>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between text-lg">
                      <span className="font-semibold">Total BSK</span>
                      <span className="font-bold">
                        {((effectivePurchase / activeCampaign.rate_snapshot_bsk_inr) + expectedBonus).toFixed(2)} BSK
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Eligibility Status */}
              {eligibility && !eligibility.eligible && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {eligibility.reason}
                    {eligibility.shortfall && ` (Need ₹${eligibility.shortfall} more)`}
                  </AlertDescription>
                </Alert>
              )}

              {eligibility && eligibility.eligible && (
                <Alert className="border-success bg-success/5">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <AlertDescription className="text-success">
                    You're eligible for this bonus!
                  </AlertDescription>
                </Alert>
              )}

              <Alert>
                <Wallet className="h-4 w-4" />
                <AlertDescription>
                  To claim this bonus, complete your BSK purchase through INR deposit or swap
                </AlertDescription>
              </Alert>

              <Button 
                size="lg" 
                className="w-full"
                disabled={!eligibility?.eligible || processing}
              >
                {processing ? "Processing..." : "Proceed to Purchase"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* User's Claim Status */}
        {userClaim && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                Your Claim Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Claims Made</p>
                  <p className="text-2xl font-bold">{userClaim.claims_count}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Total Bonus</p>
                  <p className="text-2xl font-bold text-primary">
                    {userClaim.total_bonus_bsk.toFixed(2)} BSK
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">First Claim</p>
                  <p className="text-sm font-medium">
                    {userClaim.first_claim_at ? format(new Date(userClaim.first_claim_at), 'MMM dd, yyyy') : 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Last Claim</p>
                  <p className="text-sm font-medium">
                    {userClaim.last_claim_at ? format(new Date(userClaim.last_claim_at), 'MMM dd, yyyy') : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bonus History */}
        {bonusHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Bonus History
              </CardTitle>
              <CardDescription>Your recent bonus claims</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bonusHistory.map((event) => (
                  <div 
                    key={event.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={event.status === 'settled' ? 'default' : 'secondary'}>
                          {event.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground capitalize">
                          {event.channel.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.created_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        +{event.bonus_bsk.toFixed(2)} BSK
                      </p>
                      <p className="text-xs text-muted-foreground">
                        on ₹{event.purchase_inr.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProgramPageTemplate>
  );
}
