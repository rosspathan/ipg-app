import { useState } from "react"
import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate"
import { ProgramAccessGate } from "@/components/programs/ProgramAccessGate"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Lock, Clock, Loader2, AlertTriangle, History, Coins, ArrowUpRight, ArrowDownRight, Gift } from "lucide-react"
import { useCryptoStakingAccount, type UserStake, type StakingLedgerEntry, type StakingPlan } from "@/hooks/useCryptoStakingAccount"
import { format, formatDistanceToNow } from "date-fns"

export default function StakingPage() {
  return (
    <ProgramAccessGate programKey="staking" title="Staking">
      <StakingContent />
    </ProgramAccessGate>
  )
}

function StakingContent() {
  const {
    plans,
    account,
    activeStakes,
    ledger,
    isLoading,
    stakesLoading,
    ledgerLoading,
    stakingFee,
    unstakingFee,
    availableBalance,
    stakedBalance,
    totalEarned,
    createStake,
    unstake,
    isStaking,
    isUnstaking,
  } = useCryptoStakingAccount();

  const [selectedPlan, setSelectedPlan] = useState<StakingPlan | null>(null);
  const [amount, setAmount] = useState('');
  const [unstakeTarget, setUnstakeTarget] = useState<UserStake | null>(null);

  const handleStake = () => {
    if (selectedPlan && amount) {
      createStake({ planId: selectedPlan.id, amount: Number(amount) });
      setSelectedPlan(null);
      setAmount('');
    }
  };

  const handleUnstake = () => {
    if (unstakeTarget) {
      unstake({ stakeId: unstakeTarget.id });
      setUnstakeTarget(null);
    }
  };

  const handleMaxAmount = () => {
    if (selectedPlan) {
      const max = selectedPlan.max_amount
        ? Math.min(availableBalance, selectedPlan.max_amount)
        : availableBalance;
      setAmount(String(Math.floor(max * 100) / 100));
    }
  };

  const getTxIcon = (type: string) => {
    switch (type) {
      case 'stake': return <ArrowUpRight className="h-4 w-4 text-primary" />;
      case 'unstake':
      case 'auto_unstake': return <ArrowDownRight className="h-4 w-4 text-destructive" />;
      case 'reward': return <Gift className="h-4 w-4 text-primary" />;
      default: return <Coins className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <ProgramPageTemplate title="Staking" subtitle="Earn passive rewards on your IPG">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ProgramPageTemplate>
    );
  }

  return (
    <ProgramPageTemplate title="Staking" subtitle="Earn passive rewards on your IPG">
      {/* Balance Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Available</p>
          <p className="text-lg font-bold">{Number(availableBalance).toFixed(2)}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Staked</p>
          <p className="text-lg font-bold">{Number(stakedBalance).toFixed(2)}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Earned</p>
          <p className="text-lg font-bold text-primary">{Number(totalEarned).toFixed(4)}</p>
        </Card>
      </div>

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="stakes">My Stakes</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-4">
          {plans.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground">No staking plans available</p>
            </Card>
          ) : (
            plans.map((plan) => (
              <Card key={plan.id} className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-full bg-primary/10">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Min {Number(plan.min_amount)} IPG • {plan.lock_period_days} days lock
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">{Number(plan.monthly_reward_percent)}%</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Monthly</p>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => setSelectedPlan(plan)}
                  disabled={isStaking || availableBalance < plan.min_amount}
                >
                  {availableBalance < plan.min_amount ? 'Insufficient Balance' : 'Stake Now'}
                </Button>
              </Card>
            ))
          )}
        </TabsContent>

        {/* My Stakes Tab */}
        <TabsContent value="stakes" className="space-y-4">
          {stakesLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activeStakes.length === 0 ? (
            <Card className="p-6 text-center">
              <Coins className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No active stakes</p>
            </Card>
          ) : (
            activeStakes.map((stake: UserStake) => {
              const lockDate = new Date(stake.lock_until);
              const isLocked = lockDate > new Date();
              const planName = stake.plan?.name || 'Stake';

              return (
                <Card key={stake.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold">{planName}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(stake.staked_at), 'dd MMM yyyy')}
                      </p>
                    </div>
                    <Badge variant={isLocked ? "secondary" : "default"}>
                      {isLocked ? 'Locked' : 'Unlocked'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Staked</p>
                      <p className="text-sm font-bold">{Number(stake.stake_amount).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Rate</p>
                      <p className="text-sm font-bold">{Number(stake.monthly_reward_percent)}%/mo</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Earned</p>
                      <p className="text-sm font-bold text-primary">{Number(stake.total_rewards).toFixed(4)}</p>
                    </div>
                  </div>
                  {isLocked ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground p-2 rounded-md bg-muted">
                      <Lock className="h-3 w-3" />
                      <span>Unlocks {formatDistanceToNow(lockDate, { addSuffix: true })}</span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setUnstakeTarget(stake)}
                      disabled={isUnstaking}
                    >
                      Unstake
                    </Button>
                  )}
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-2">
          {ledgerLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : ledger.length === 0 ? (
            <Card className="p-6 text-center">
              <History className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </Card>
          ) : (
            ledger.map((entry: StakingLedgerEntry) => (
              <Card key={entry.id} className="p-3">
                <div className="flex items-center gap-3">
                  {getTxIcon(entry.tx_type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">{entry.tx_type.replace('_', ' ')}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{entry.notes}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${entry.tx_type === 'reward' ? 'text-primary' : ''}`}>
                      {entry.tx_type === 'stake' ? '-' : '+'}{Number(entry.amount).toFixed(4)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(entry.created_at), 'dd MMM HH:mm')}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Stake Dialog */}
      <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stake IPG — {selectedPlan?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Amount (IPG)</Label>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-primary" onClick={handleMaxAmount}>
                  MAX
                </Button>
              </div>
              <Input
                type="number"
                placeholder={`Min: ${selectedPlan?.min_amount || 0} IPG`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={selectedPlan?.min_amount || 0}
                max={selectedPlan?.max_amount || undefined}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Available: {Number(availableBalance).toFixed(2)} IPG
              </p>
            </div>
            <div className="rounded-lg bg-muted p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Reward:</span>
                <span className="font-semibold">{selectedPlan?.monthly_reward_percent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lock Period:</span>
                <span className="font-semibold">{selectedPlan?.lock_period_days} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Staking Fee:</span>
                <span className="font-semibold">{stakingFee}%</span>
              </div>
              {amount && Number(amount) >= (selectedPlan?.min_amount || 0) && (
                <>
                  <div className="border-t pt-1.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fee Deducted:</span>
                      <span className="font-semibold">{(Number(amount) * stakingFee / 100).toFixed(4)} IPG</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Net Staked:</span>
                      <span className="font-semibold text-primary">
                        {(Number(amount) * (1 - stakingFee / 100)).toFixed(4)} IPG
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Est. Monthly Return:</span>
                      <span className="font-semibold text-primary">
                        {(Number(amount) * (1 - stakingFee / 100) * (selectedPlan?.monthly_reward_percent || 0) / 100).toFixed(4)} IPG
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
            <Button
              onClick={handleStake}
              disabled={isStaking || !amount || Number(amount) < (selectedPlan?.min_amount || 0) || Number(amount) > availableBalance}
              className="w-full"
            >
              {isStaking ? 'Processing...' : 'Confirm Stake'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unstake Confirmation Dialog */}
      <Dialog open={!!unstakeTarget} onOpenChange={() => setUnstakeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unstake IPG</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stake Amount:</span>
                <span className="font-semibold">{Number(unstakeTarget?.stake_amount || 0).toFixed(4)} IPG</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rewards Earned:</span>
                <span className="font-semibold text-primary">{Number(unstakeTarget?.total_rewards || 0).toFixed(4)} IPG</span>
              </div>
              <div className="border-t pt-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unstaking Fee ({unstakingFee}%):</span>
                  <span className="font-semibold text-destructive">
                    -{((Number(unstakeTarget?.stake_amount || 0) + Number(unstakeTarget?.total_rewards || 0)) * unstakingFee / 100).toFixed(4)} IPG
                  </span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>You Receive:</span>
                  <span className="text-primary">
                    {((Number(unstakeTarget?.stake_amount || 0) + Number(unstakeTarget?.total_rewards || 0)) * (1 - unstakingFee / 100)).toFixed(4)} IPG
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>Unstaking will deduct a {unstakingFee}% exit fee from your total (stake + rewards). This action cannot be undone.</p>
            </div>
            <Button
              onClick={handleUnstake}
              disabled={isUnstaking}
              variant="destructive"
              className="w-full"
            >
              {isUnstaking ? 'Processing...' : 'Confirm Unstake'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ProgramPageTemplate>
  )
}
