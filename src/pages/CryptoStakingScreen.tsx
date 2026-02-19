import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BacklinkBar } from "@/components/programs-pro/BacklinkBar";
import { 
  Coins, Lock, TrendingUp, ArrowRight, Wallet, History, 
  ChevronDown, AlertCircle, Loader2, ArrowDownToLine, 
  Zap, Shield, Clock, AlertTriangle, RefreshCw, X, Bell
} from "lucide-react";
import { useNavigation } from "@/hooks/useNavigation";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCryptoStakingAccount, type UserStake, type StakingLedgerEntry } from "@/hooks/useCryptoStakingAccount";
import { useStakingNotifications } from "@/hooks/useStakingNotifications";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useOnchainBalances } from "@/hooks/useOnchainBalances";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function CryptoStakingScreen() {
  const { navigate } = useNavigation();
  const [activeTab, setActiveTab] = useState<'plans' | 'stakes' | 'history'>('plans');
  const [howOpen, setHowOpen] = useState(false);

  // Dialog states
  const [unstakeDialog, setUnstakeDialog] = useState<{ open: boolean; stake: UserStake | null }>({ open: false, stake: null });
  const [earlyUnstakeDialog, setEarlyUnstakeDialog] = useState<{ open: boolean; stake: UserStake | null }>({ open: false, stake: null });
  const [restakeDialog, setRestakeDialog] = useState<{ open: boolean; stake: UserStake | null }>({ open: false, stake: null });
  const [notifOpen, setNotifOpen] = useState(false);

  const { notifications, unreadCount, markRead, markAllRead } = useStakingNotifications();

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
    earlyUnstakePenalty,
    availableBalance,
    stakedBalance,
    totalEarned,
    unstake,
    earlyUnstake,
    createStake,
    isUnstaking,
    isEarlyUnstaking,
    isStaking,
  } = useCryptoStakingAccount();

  const { balances: onchainBalances } = useOnchainBalances();
  const ipgOnchainBalance = onchainBalances.find(b => b.symbol === 'IPG')?.balance || 0;
  const bnbBalance = onchainBalances.find(b => b.symbol === 'BNB')?.balance || 0;
  const hasEnoughGas = bnbBalance > 0.001;

  const handleSelectPlan = (planId: string) => {
    navigate(`/app/staking/${planId}`);
  };

  const tabs = [
    { key: 'plans' as const, label: 'Plans' },
    { key: 'stakes' as const, label: 'My Stakes' },
    { key: 'history' as const, label: 'History' },
  ];

  const minReward = plans.length > 0 ? Math.min(...plans.map(p => Number(p.monthly_reward_percent))) : 4;
  const maxReward = plans.length > 0 ? Math.max(...plans.map(p => Number(p.monthly_reward_percent))) : 10;
  const lockDays = plans.length > 0 ? plans[0].lock_period_days : 30;

  // Confirm normal unstake
  const handleConfirmUnstake = () => {
    if (!unstakeDialog.stake) return;
    unstake({ stakeId: unstakeDialog.stake.id }, {
      onSuccess: () => setUnstakeDialog({ open: false, stake: null }),
    });
  };

  // Confirm early unstake
  const handleConfirmEarlyUnstake = () => {
    if (!earlyUnstakeDialog.stake) return;
    earlyUnstake({ stakeId: earlyUnstakeDialog.stake.id }, {
      onSuccess: () => setEarlyUnstakeDialog({ open: false, stake: null }),
    });
  };

  // Confirm re-stake: pick same plan, create a new stake with available balance
  const handleConfirmRestake = () => {
    if (!restakeDialog.stake) return;
    const stake = restakeDialog.stake;
    const maxRestake = Math.min(availableBalance, 20);
    if (maxRestake < (stake.plan?.min_amount || 1)) {
      setRestakeDialog({ open: false, stake: null });
      navigate('/app/staking/deposit');
      return;
    }
    createStake(
      { planId: stake.plan_id, amount: maxRestake },
      { onSuccess: () => setRestakeDialog({ open: false, stake: null }) }
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="px-4 pt-5 pb-24 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <BacklinkBar programName="IPG Staking" parentRoute="/app/home" />
          </div>
          {/* Notifications Bell */}
          <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
            <SheetTrigger asChild>
              <button className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-card border border-border/40 flex-shrink-0 ml-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[340px] p-0">
              <SheetHeader className="px-4 py-4 border-b border-border/30 flex flex-row items-center justify-between">
                <SheetTitle className="text-sm font-semibold">Staking Notifications</SheetTitle>
                {unreadCount > 0 && (
                  <button onClick={() => markAllRead()} className="text-[11px] text-accent underline">
                    Mark all read
                  </button>
                )}
              </SheetHeader>
              <div className="overflow-y-auto h-full pb-10">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                    <Bell className="w-8 h-8 text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No notifications yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Deposits, rewards, and unlocks will appear here</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.is_read && markRead(n.id)}
                      className={cn(
                        "px-4 py-3.5 border-b border-border/20 cursor-pointer transition-colors",
                        !n.is_read ? "bg-accent/5" : "hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center text-base flex-shrink-0">
                          {n.type === 'staking_reward' ? '✨' : n.type === 'staking_deposit' ? '⬇️' : n.type === 'staking_unlocked' ? '🔓' : '🔔'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-foreground">{n.title}</p>
                            {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground/50 mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* ─── Hero Banner ─── */}
        <div className="relative rounded-2xl overflow-hidden bg-card border border-border/40">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--accent)/0.12),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--primary)/0.08),transparent_60%)]" />
          <div className="relative z-10 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-1">IPG STAKING</p>
                <p className="text-[26px] font-bold leading-tight text-foreground">
                  Earn <span className="text-accent">{minReward}–{maxReward}%</span>
                  <br />Monthly
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-accent/15 border border-accent/20">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/20">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-foreground/75">{lockDays} Days Lock</span>
              </div>
              <div className="w-px h-3.5 bg-border/50" />
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-foreground/75">{stakingFee}% Fee</span>
              </div>
              <div className="w-px h-3.5 bg-border/50" />
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-foreground/75">Auto-compound</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Balance Overview ─── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3.5 bg-card border border-border/40 space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md flex items-center justify-center bg-primary/15">
                <Wallet className="w-3 h-3 text-primary" />
              </div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">On-Chain</p>
            </div>
            <p className="text-base font-bold text-foreground tabular-nums">
              {ipgOnchainBalance.toFixed(2)}
              <span className="text-[10px] font-normal text-muted-foreground ml-1">IPG</span>
            </p>
            {!hasEnoughGas && <p className="text-[9px] text-warning">Low BNB for gas</p>}
          </div>
          <div className="rounded-xl p-3.5 bg-card border border-accent/15 space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md flex items-center justify-center bg-accent/15">
                <Coins className="w-3 h-3 text-accent" />
              </div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Staking</p>
            </div>
            <p className="text-base font-bold text-foreground tabular-nums">
              {isLoading ? '...' : Number(availableBalance).toFixed(2)}
              <span className="text-[10px] font-normal text-muted-foreground ml-1">IPG</span>
            </p>
          </div>
        </div>

        {(stakedBalance > 0 || totalEarned > 0) && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3.5 bg-card border border-border/30">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Locked / Staked</p>
              <p className="text-sm font-bold text-foreground tabular-nums">{Number(stakedBalance).toFixed(2)} <span className="text-muted-foreground font-normal text-xs">IPG</span></p>
            </div>
            <div className="rounded-xl p-3.5 bg-card border border-border/30">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Total Earned</p>
              <p className="text-sm font-bold text-accent tabular-nums">{Number(totalEarned).toFixed(4)} <span className="text-muted-foreground font-normal text-xs">IPG</span></p>
            </div>
          </div>
        )}

        {/* ─── Primary Actions ─── */}
        <div className="flex gap-2.5">
          <Button onClick={() => navigate("/app/staking/deposit")} className="flex-1 h-11 text-sm font-semibold rounded-xl gap-2">
            <ArrowDownToLine className="w-4 h-4" />
            Fund Staking
          </Button>
          {activeStakes.length > 0 && (
            <Button variant="outline" onClick={() => setActiveTab('stakes')} className="h-11 px-4 text-sm font-medium rounded-xl border-border/50">
              My Stakes
            </Button>
          )}
        </div>

        {/* ─── How It Works ─── */}
        <Collapsible open={howOpen} onOpenChange={setHowOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium bg-card border border-border/40 text-foreground/80">
              <span>How It Works</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-200 text-muted-foreground", howOpen && "rotate-180")} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 py-4 mt-1 rounded-xl text-xs leading-relaxed bg-card border border-border/30 text-muted-foreground space-y-2">
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-accent/15 text-accent flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">1</span>
                <p><strong className="text-foreground/80">Fund</strong> — Transfer IPG from your on-chain wallet to your staking account (0.01–20 IPG per transfer).</p>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-accent/15 text-accent flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">2</span>
                <p><strong className="text-foreground/80">Stake</strong> — Choose a plan and lock your IPG. A {stakingFee}% entry fee applies.</p>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-accent/15 text-accent flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">3</span>
                <p><strong className="text-foreground/80">Earn</strong> — Monthly rewards auto-credited. Unstake after {lockDays} days ({unstakingFee}% exit fee). Early exit available with {earlyUnstakePenalty}% penalty.</p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* ─── Tabs ─── */}
        <div className="flex items-center gap-0 h-10 bg-card rounded-xl border border-border/40 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 h-full rounded-lg text-xs font-medium transition-all duration-200",
                activeTab === tab.key ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground/75"
              )}
            >
              {tab.label}
              {tab.key === 'stakes' && activeStakes.length > 0 && (
                <span className={cn("ml-1 text-[9px] px-1 py-0.5 rounded-full", activeTab === tab.key ? "bg-accent-foreground/20" : "bg-muted")}>
                  {activeStakes.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ─── Plans Tab ─── */}
        {activeTab === 'plans' && (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground px-0.5">Choose a Plan</p>
            {isLoading ? (
              <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : plans.length === 0 ? (
              <div className="p-6 rounded-xl text-center bg-card border border-border/30">
                <p className="text-sm text-muted-foreground">No staking plans available</p>
              </div>
            ) : (
              plans.map((plan) => {
                const isElite = plan.name === 'Elite';
                const isPremiumTier = plan.name === 'Premium' || plan.name === 'Elite';
                const accentColor = isPremiumTier ? "border-l-primary" : "border-l-accent";
                const rewardColor = isPremiumTier ? "text-primary" : "text-accent";
                return (
                  <button
                    key={plan.id}
                    onClick={() => handleSelectPlan(plan.id)}
                    className={cn(
                      "w-full text-left relative rounded-xl p-4 transition-all duration-200 group",
                      "bg-card border border-border/40 active:scale-[0.99]",
                      `border-l-[3px] ${accentColor}`,
                      "hover:border-border/60 hover:shadow-md"
                    )}
                  >
                    {isElite && (
                      <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                        Best Value
                      </span>
                    )}
                    <div className="flex items-center justify-between pr-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                        <p className="text-xs mt-0.5 text-muted-foreground">Min {Number(plan.min_amount)} IPG</p>
                      </div>
                      <div className="text-right">
                        <p className={cn("text-2xl font-bold tabular-nums", rewardColor)}>{Number(plan.monthly_reward_percent)}%</p>
                        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Monthly</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/25">
                      <div className="flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">{plan.lock_period_days}d lock</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">Auto-compound</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-35 group-hover:opacity-70 transition-opacity" />
                    </div>
                  </button>
                );
              })
            )}

            <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-muted/30 border border-border/20 mt-1">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-muted-foreground" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground/70">Fee Structure</span>{" "}
                · Staking: {stakingFee}% at entry · Unstaking: {unstakingFee}% at withdrawal · Early Exit: {earlyUnstakePenalty}% penalty, rewards forfeited
              </p>
            </div>
          </div>
        )}

        {/* ─── My Stakes Tab ─── */}
        {activeTab === 'stakes' && (
          <div className="space-y-3">
            {stakesLoading ? (
              <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : activeStakes.length === 0 ? (
              <div className="p-8 rounded-2xl text-center bg-card border border-border/30">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-muted/40">
                  <Coins className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold mb-1.5 text-foreground">No Active Stakes</p>
                <p className="text-xs mb-5 text-muted-foreground leading-relaxed">
                  Start staking to earn monthly rewards on your IPG tokens
                </p>
                <Button size="sm" onClick={() => setActiveTab('plans')} className="h-9 text-xs rounded-xl px-5">
                  View Plans
                </Button>
              </div>
            ) : (
              activeStakes.map((stake: UserStake) => {
                const planName = stake.plan?.name || 'Stake';
                const isPremiumTier = planName === 'Premium' || planName === 'Elite';
                const lockDate = new Date(stake.lock_until);
                const isLocked = lockDate > new Date();
                const accentBorder = isPremiumTier ? "border-l-primary" : "border-l-accent";
                const rewardColor = isPremiumTier ? "text-primary" : "text-accent";
                const unstakingFeeAmt = (Number(stake.stake_amount) + Number(stake.total_rewards)) * (unstakingFee / 100);
                const earlyPenaltyAmt = Number(stake.stake_amount) * (earlyUnstakePenalty / 100);
                const daysLeft = isLocked ? Math.ceil((lockDate.getTime() - Date.now()) / 86400000) : 0;

                return (
                  <div key={stake.id} className={cn("rounded-xl p-4 bg-card border border-border/40", `border-l-[3px] ${accentBorder}`)}>
                    <div className="flex items-center justify-between mb-3.5">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{planName} Plan</p>
                        <p className="text-[11px] mt-0.5 text-muted-foreground">
                          Staked {format(new Date(stake.staked_at), 'dd MMM yyyy')}
                        </p>
                      </div>
                      <span className={cn(
                        "text-[10px] font-semibold px-2.5 py-1 rounded-full",
                        isLocked ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
                      )}>
                        {isLocked ? '🔒 Locked' : '✓ Unlocked'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-muted/20 mb-3.5">
                      <div className="text-center">
                        <p className="text-[9px] uppercase tracking-wide text-muted-foreground mb-0.5">Staked</p>
                        <p className="text-sm font-bold text-foreground tabular-nums">{Number(stake.stake_amount).toFixed(2)}</p>
                        <p className="text-[9px] text-muted-foreground">IPG</p>
                      </div>
                      <div className="text-center border-x border-border/30">
                        <p className="text-[9px] uppercase tracking-wide text-muted-foreground mb-0.5">APR</p>
                        <p className={cn("text-sm font-bold tabular-nums", rewardColor)}>{Number(stake.monthly_reward_percent)}%</p>
                        <p className="text-[9px] text-muted-foreground">mo.</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] uppercase tracking-wide text-muted-foreground mb-0.5">Earned</p>
                        <p className={cn("text-sm font-bold tabular-nums", rewardColor)}>{Number(stake.total_rewards).toFixed(4)}</p>
                        <p className="text-[9px] text-muted-foreground">IPG</p>
                      </div>
                    </div>

                    {/* Lock info */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <p className="text-[11px] text-muted-foreground">
                          {isLocked
                            ? `Unlocks ${formatDistanceToNow(lockDate, { addSuffix: true })} (${daysLeft}d left)`
                            : `Unlocked on ${format(lockDate, 'dd MMM yyyy')}`}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      {!isLocked ? (
                        <>
                          {/* Normal unstake (fee shown) */}
                          <Button
                            size="sm"
                            onClick={() => setUnstakeDialog({ open: true, stake })}
                            disabled={isUnstaking}
                            className="flex-1 h-8 text-[11px] rounded-lg"
                          >
                            {isUnstaking ? <Loader2 className="w-3 h-3 animate-spin" /> : `Unstake (${unstakingFee}% fee)`}
                          </Button>
                          {/* Re-stake button */}
                          {availableBalance >= (stake.plan?.min_amount || 1) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRestakeDialog({ open: true, stake })}
                              disabled={isStaking}
                              className="flex-1 h-8 text-[11px] rounded-lg border-accent/30 text-accent gap-1"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Re-stake
                            </Button>
                          )}
                        </>
                      ) : (
                        /* Early exit while locked */
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEarlyUnstakeDialog({ open: true, stake })}
                          disabled={isEarlyUnstaking}
                          className="w-full h-8 text-[11px] rounded-lg border-destructive/30 text-destructive gap-1"
                        >
                          <X className="w-3 h-3" />
                          Early Exit ({earlyUnstakePenalty}% penalty)
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── History Tab ─── */}
        {activeTab === 'history' && (
          <div className="space-y-2.5">
            {ledgerLoading ? (
              <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : ledger.length === 0 ? (
              <div className="p-8 rounded-2xl text-center bg-card border border-border/30">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-muted/40">
                  <History className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold mb-1.5 text-foreground">No History Yet</p>
                <p className="text-xs text-muted-foreground">Your staking transactions will appear here</p>
              </div>
            ) : (
              ledger.map((entry: StakingLedgerEntry) => {
                const typeConfig: Record<string, { label: string; icon: string; positive: boolean }> = {
                  deposit:       { label: 'Deposit',      icon: '⬇', positive: true },
                  stake:         { label: 'Staked',       icon: '🔒', positive: false },
                  unstake:       { label: 'Unstaked',     icon: '🔓', positive: true },
                  early_unstake: { label: 'Early Exit',   icon: '⚠️', positive: true },
                  reward:        { label: 'Reward',       icon: '✨', positive: true },
                  withdrawal:    { label: 'Withdrawal',   icon: '⬆', positive: false },
                  fee:           { label: 'Fee',          icon: '📊', positive: false },
                };
                const cfg = typeConfig[entry.tx_type] || { label: entry.tx_type, icon: '•', positive: true };
                return (
                  <div key={entry.id} className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center text-base">{cfg.icon}</div>
                      <div>
                        <p className="text-xs font-semibold text-foreground/90">{cfg.label}</p>
                        <p className="text-[10px] mt-0.5 text-muted-foreground">{format(new Date(entry.created_at), 'dd MMM yyyy, HH:mm')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-sm font-bold tabular-nums", cfg.positive ? "text-accent" : "text-destructive")}>
                        {cfg.positive ? '+' : '-'}{Math.abs(Number(entry.amount)).toFixed(4)}
                        <span className="text-[10px] font-normal text-muted-foreground ml-1">IPG</span>
                      </p>
                      {Number(entry.fee_amount) > 0 && (
                        <p className="text-[10px] text-muted-foreground">fee: {Number(entry.fee_amount).toFixed(4)}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ─── Normal Unstake Confirmation Dialog ─── */}
      <AlertDialog open={unstakeDialog.open} onOpenChange={(o) => !o && setUnstakeDialog({ open: false, stake: null })}>
        <AlertDialogContent className="max-w-sm mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Unstake</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                {unstakeDialog.stake && (() => {
                  const s = unstakeDialog.stake!;
                  const total = Number(s.stake_amount) + Number(s.total_rewards);
                  const fee = total * (unstakingFee / 100);
                  const net = total - fee;
                  return (
                    <div className="rounded-lg bg-muted/40 p-3 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span>Principal</span>
                        <span className="font-medium text-foreground">{Number(s.stake_amount).toFixed(4)} IPG</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rewards earned</span>
                        <span className="font-medium text-accent">+{Number(s.total_rewards).toFixed(4)} IPG</span>
                      </div>
                      <div className="flex justify-between border-t border-border/30 pt-2">
                        <span>Exit fee ({unstakingFee}%)</span>
                        <span className="font-medium text-destructive">-{fee.toFixed(4)} IPG</span>
                      </div>
                      <div className="flex justify-between font-semibold text-sm">
                        <span className="text-foreground">You receive</span>
                        <span className="text-foreground">{net.toFixed(4)} IPG</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUnstake} disabled={isUnstaking}>
              {isUnstaking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Unstake'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Early Unstake Warning Dialog ─── */}
      <AlertDialog open={earlyUnstakeDialog.open} onOpenChange={(o) => !o && setEarlyUnstakeDialog({ open: false, stake: null })}>
        <AlertDialogContent className="max-w-sm mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Early Exit Warning
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>You are exiting <strong>before the lock period ends</strong>. This incurs a heavy penalty.</p>
                {earlyUnstakeDialog.stake && (() => {
                  const s = earlyUnstakeDialog.stake!;
                  const daysLeft = Math.ceil((new Date(s.lock_until).getTime() - Date.now()) / 86400000);
                  const penalty = Number(s.stake_amount) * (earlyUnstakePenalty / 100);
                  const net = Number(s.stake_amount) - penalty;
                  return (
                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span>Days remaining</span>
                        <span className="font-medium text-warning">{daysLeft} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Principal</span>
                        <span className="font-medium text-foreground">{Number(s.stake_amount).toFixed(4)} IPG</span>
                      </div>
                      <div className="flex justify-between text-destructive">
                        <span>Early penalty ({earlyUnstakePenalty}%)</span>
                        <span className="font-medium">-{penalty.toFixed(4)} IPG</span>
                      </div>
                      <div className="flex justify-between text-destructive">
                        <span>Rewards forfeited</span>
                        <span className="font-medium">-{Number(s.total_rewards).toFixed(4)} IPG</span>
                      </div>
                      <div className="flex justify-between font-semibold text-sm border-t border-destructive/20 pt-2">
                        <span className="text-foreground">You receive</span>
                        <span className="text-foreground">{net.toFixed(4)} IPG</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Staking</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmEarlyUnstake}
              disabled={isEarlyUnstaking}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isEarlyUnstaking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Exit Anyway'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Re-Stake Confirmation Dialog ─── */}
      <AlertDialog open={restakeDialog.open} onOpenChange={(o) => !o && setRestakeDialog({ open: false, stake: null })}>
        <AlertDialogContent className="max-w-sm mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-accent" />
              Re-Stake Confirmation
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Stake your available balance back into the same plan automatically.</p>
                {restakeDialog.stake && (() => {
                  const s = restakeDialog.stake!;
                  const max = Math.min(availableBalance, 20);
                  const fee = max * (stakingFee / 100);
                  const net = max - fee;
                  const monthlyReward = net * (Number(s.monthly_reward_percent) / 100);
                  const lockDate = new Date(Date.now() + (s.plan?.lock_period_days || 30) * 86400000);
                  return (
                    <div className="rounded-lg bg-muted/40 p-3 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span>Plan</span>
                        <span className="font-medium text-foreground">{s.plan?.name || 'Stake'} ({Number(s.monthly_reward_percent)}%/mo)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Stake amount</span>
                        <span className="font-medium text-foreground">{max.toFixed(4)} IPG</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Entry fee ({stakingFee}%)</span>
                        <span className="font-medium text-destructive">-{fee.toFixed(4)} IPG</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Net staked</span>
                        <span className="font-medium text-foreground">{net.toFixed(4)} IPG</span>
                      </div>
                      <div className="flex justify-between text-accent">
                        <span>Est. monthly reward</span>
                        <span className="font-medium">+{monthlyReward.toFixed(4)} IPG</span>
                      </div>
                      <div className="flex justify-between border-t border-border/30 pt-2">
                        <span>Locks until</span>
                        <span className="font-medium text-foreground">{format(lockDate, 'dd MMM yyyy')}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRestake} disabled={isStaking}>
              {isStaking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Re-Stake'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
