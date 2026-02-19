import * as React from "react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BacklinkBar } from "@/components/programs-pro/BacklinkBar";
import { Lock, TrendingUp, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { useNavigation } from "@/hooks/useNavigation";
import { useCryptoStakingAccount } from "@/hooks/useCryptoStakingAccount";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CryptoStakingPlanDetail() {
  const { planId } = useParams<{ planId: string }>();
  const { navigate } = useNavigation();
  const [amount, setAmount] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const {
    plans,
    isLoading,
    availableBalance,
    stakingFee,
    unstakingFee,
    earlyUnstakePenalty,
    createStake,
    isStaking,
  } = useCryptoStakingAccount();

  const plan = plans.find(p => p.id === planId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="px-4 py-5">
          <BacklinkBar programName="Plan Not Found" parentRoute="/app/staking" />
          <div className="text-center mt-10">
            <p className="text-sm text-muted-foreground">This staking plan is not available.</p>
            <Button onClick={() => navigate('/app/staking')} className="mt-4" size="sm">Back to Plans</Button>
          </div>
        </div>
      </div>
    );
  }

  const isPremiumTier = plan.name === 'Premium' || plan.name === 'Elite';
  const minAmount = Number(plan.min_amount);
  const maxAmount = plan.max_amount ? Number(plan.max_amount) : null;
  const rewardPercent = Number(plan.monthly_reward_percent);
  const numericAmount = Number(amount) || 0;
  const feeAmount = numericAmount * (stakingFee / 100);
  const netStaked = numericAmount - feeAmount;
  const monthlyReward = netStaked * (rewardPercent / 100);
  const globalMax = 20;
  const effectiveMax = maxAmount ? Math.min(maxAmount, globalMax) : globalMax;
  const canStake = numericAmount >= minAmount && numericAmount <= availableBalance && numericAmount <= effectiveMax && numericAmount >= 0.01;
  const lockUntil = new Date(Date.now() + plan.lock_period_days * 86400000);

  const handleMax = () => {
    const max = Math.min(availableBalance, effectiveMax);
    setAmount(max > 0 ? String(Number(max.toFixed(8))) : '');
  };

  const handleConfirmStake = () => {
    createStake(
      { planId: plan.id, amount: numericAmount },
      { onSuccess: () => { setConfirmOpen(false); navigate('/app/staking'); } }
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="px-4 py-5 space-y-6">
        <BacklinkBar programName={`${plan.name} Plan`} parentRoute="/app/staking" />

        {/* Plan Header */}
        <div className={cn(
          "relative p-5 rounded-xl overflow-hidden bg-card border border-border/40",
          isPremiumTier ? "border-l-[3px] border-l-primary" : "border-l-[3px] border-l-accent"
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-foreground">{plan.name}</p>
              <p className="text-xs mt-0.5 text-muted-foreground">
                Min {minAmount < 0.01 ? 0.01 : minAmount} IPG {effectiveMax ? `• Max ${effectiveMax} IPG` : ''}
              </p>
            </div>
            <div className="text-right">
              <p className={cn("text-3xl font-bold", isPremiumTier ? "text-primary" : "text-accent")}>{rewardPercent}%</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Monthly</p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/30">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">{plan.lock_period_days} days lock</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">Auto-compound</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">{stakingFee}% entry fee</span>
            </div>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Stake Amount</p>
            <p className="text-xs text-muted-foreground">
              Available: <span className="text-foreground/85">{Number(availableBalance).toFixed(4)} IPG</span>
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="number"
                placeholder={`Min ${minAmount} IPG`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-12 text-base font-medium pr-14 bg-card border-border/40 text-foreground"
                min={minAmount}
                step="0.01"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">IPG</span>
            </div>
            <Button
              variant="outline"
              onClick={handleMax}
              className={cn("h-12 px-4 text-xs font-medium bg-transparent", isPremiumTier ? "border-primary/40 text-primary" : "border-accent/40 text-accent")}
            >
              MAX
            </Button>
          </div>

          {numericAmount > 0 && numericAmount < minAmount && (
            <p className="text-[11px] text-destructive">Minimum stake amount is {minAmount} IPG</p>
          )}
          {numericAmount > availableBalance && (
            <p className="text-[11px] text-destructive">
              Insufficient balance.{' '}
              <button onClick={() => navigate('/app/staking/deposit')} className={cn("underline", isPremiumTier ? "text-primary" : "text-accent")}>
                Fund account
              </button>
            </p>
          )}
          {numericAmount > effectiveMax && (
            <p className="text-[11px] text-destructive">Maximum stake is {effectiveMax} IPG</p>
          )}
        </div>

        {/* Live Preview Summary */}
        {numericAmount >= minAmount && (
          <div className="rounded-xl p-4 space-y-3 bg-card border border-border/30">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Stake Amount</span>
                <span className="text-foreground/85">{numericAmount.toFixed(4)} IPG</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Entry Fee ({stakingFee}%)</span>
                <span className="text-destructive">-{feeAmount.toFixed(4)} IPG</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-border/30">
                <span className="text-muted-foreground">Net Staked</span>
                <span className="font-semibold text-foreground">{netStaked.toFixed(4)} IPG</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Est. Monthly Reward</span>
                <span className={cn("font-semibold", isPremiumTier ? "text-primary" : "text-accent")}>+{monthlyReward.toFixed(4)} IPG</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Lock Until</span>
                <span className="text-foreground/85">{lockUntil.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Exit Fee (after lock)</span>
                <span className="text-muted-foreground">{unstakingFee}% on total</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Early Exit Penalty</span>
                <span className="text-warning">{earlyUnstakePenalty}% + rewards forfeited</span>
              </div>
            </div>
          </div>
        )}

        {/* Stake Button → opens confirm dialog */}
        <Button
          onClick={() => setConfirmOpen(true)}
          disabled={!canStake || isStaking}
          className="w-full h-12 text-sm font-semibold rounded-xl"
        >
          {isStaking ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
          ) : (
            <><Lock className="w-4 h-4 mr-2" /> Review & Stake</>
          )}
        </Button>

        {/* Warning */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-warning/5 border border-warning/15">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-warning" />
          <div className="text-[11px] leading-relaxed text-muted-foreground">
            <p className="font-medium mb-0.5 text-warning">Important</p>
            <p>Your IPG will be locked for {plan.lock_period_days} days. Early exit incurs a {earlyUnstakePenalty}% penalty and forfeits all rewards. After lock, a {unstakingFee}% unstaking fee applies.</p>
          </div>
        </div>
      </div>

      {/* ─── Stake Confirmation Dialog (Enhancement #8) ─── */}
      <AlertDialog open={confirmOpen} onOpenChange={(o) => !o && setConfirmOpen(false)}>
        <AlertDialogContent className="max-w-sm mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-accent" />
              Confirm Stake
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>You are about to stake into the <strong className="text-foreground">{plan.name}</strong> plan. Please review the fee breakdown.</p>
                <div className="rounded-lg bg-muted/40 p-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Stake amount</span>
                    <span className="font-medium text-foreground">{numericAmount.toFixed(4)} IPG</span>
                  </div>
                  <div className="flex justify-between text-destructive">
                    <span>Entry fee ({stakingFee}%)</span>
                    <span className="font-medium">-{feeAmount.toFixed(4)} IPG</span>
                  </div>
                  <div className="flex justify-between border-t border-border/30 pt-2 font-semibold text-sm">
                    <span className="text-foreground">Net staked</span>
                    <span className="text-foreground">{netStaked.toFixed(4)} IPG</span>
                  </div>
                  <div className="flex justify-between text-accent">
                    <span>Est. monthly reward</span>
                    <span className="font-medium">+{monthlyReward.toFixed(4)} IPG</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lock until</span>
                    <span className="font-medium text-foreground">{format(lockUntil, 'dd MMM yyyy')}</span>
                  </div>
                  <div className="border-t border-border/20 pt-2 text-warning text-[10px]">
                    ⚠ Early exit: {earlyUnstakePenalty}% penalty + rewards forfeited
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStake} disabled={isStaking}>
              {isStaking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Stake'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
