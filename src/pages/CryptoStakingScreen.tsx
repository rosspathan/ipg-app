import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BacklinkBar } from "@/components/programs-pro/BacklinkBar";
import { Coins, Lock, TrendingUp, ArrowRight, Wallet, History, ChevronDown, AlertCircle, Loader2 } from "lucide-react";
import { useNavigation } from "@/hooks/useNavigation";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCryptoStakingAccount, type UserStake, type StakingLedgerEntry } from "@/hooks/useCryptoStakingAccount";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function CryptoStakingScreen() {
  const { navigate } = useNavigation();
  const [activeTab, setActiveTab] = useState<'plans' | 'stakes' | 'history'>('plans');
  const [howOpen, setHowOpen] = useState(false);

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
  } = useCryptoStakingAccount();

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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="px-4 py-5 space-y-6">
        <BacklinkBar programName="Crypto Staking" parentRoute="/app/home" />

        {/* ─── Hero Section ─── */}
        <div className="relative p-5 rounded-xl overflow-hidden bg-card border border-accent/10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full opacity-[0.07] pointer-events-none bg-[radial-gradient(circle,hsl(var(--accent))_0%,transparent_70%)]" />

          <div className="relative z-10">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] mb-1 text-muted-foreground">
              IPG Staking
            </p>
            <p className="text-[28px] font-bold leading-tight text-foreground">
              Earn <span className="text-accent">{minReward}–{maxReward}%</span> Monthly
            </p>

            <div className="flex items-center gap-5 mt-4">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground/85">{lockDays} Days Lock</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground/85">{stakingFee}% Fee</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── How It Works (Collapsible) ─── */}
        <Collapsible open={howOpen} onOpenChange={setHowOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium bg-card border border-border/40 text-foreground/85">
              <span>How It Works</span>
              <ChevronDown
                className={cn(
                  "w-4 h-4 transition-transform duration-200 text-muted-foreground",
                  howOpen && "rotate-180"
                )}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 py-3 mt-1 rounded-lg text-xs leading-relaxed bg-card border border-border/30 text-muted-foreground">
              Transfer IPG from your wallet to your staking account, choose a plan, and earn automatic monthly rewards.
              Entry fee: {stakingFee}% • Exit fee: {unstakingFee}% • Rewards auto-compound monthly.
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* ─── Tab Section ─── */}
        <div className="flex items-center gap-6 h-9 px-1 border-b border-border/30">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "relative pb-2.5 text-sm font-medium transition-colors duration-200",
                activeTab === tab.key ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-accent" />
              )}
            </button>
          ))}
        </div>

        {/* ─── Plans Tab ─── */}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            {/* Staking Account Balance */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-card/80 border border-accent/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-accent/10">
                  <Wallet className="w-4.5 h-4.5 text-accent" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Staking Balance</p>
                  <p className="text-lg font-bold text-foreground">
                    {isLoading ? '...' : `${Number(availableBalance).toFixed(2)} IPG`}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/app/staking/deposit")}
                className="h-8 text-xs font-medium rounded-lg px-4 border-accent/25 text-accent bg-transparent"
              >
                Fund
              </Button>
            </div>

            {/* Staked & Earned Summary */}
            {(stakedBalance > 0 || totalEarned > 0) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-card border border-border/30">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Staked</p>
                  <p className="text-base font-bold mt-0.5 text-foreground">{Number(stakedBalance).toFixed(2)} IPG</p>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border/30">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Earned</p>
                  <p className="text-base font-bold mt-0.5 text-accent">{Number(totalEarned).toFixed(2)} IPG</p>
                </div>
              </div>
            )}

            {/* Plan List */}
            <div className="space-y-3.5">
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
                Choose a Plan
              </p>

              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : plans.length === 0 ? (
                <div className="p-6 rounded-xl text-center bg-card border border-border/30">
                  <p className="text-sm text-muted-foreground">No staking plans available</p>
                </div>
              ) : (
                plans.map((plan) => {
                  const isElite = plan.name === 'Elite';
                  const isPremiumTier = plan.name === 'Premium' || plan.name === 'Elite';
                  return (
                    <button
                      key={plan.id}
                      onClick={() => handleSelectPlan(plan.id)}
                      className={cn(
                        "w-full text-left relative rounded-xl p-4 transition-all duration-200 group",
                        "bg-card border border-border/40",
                        isPremiumTier ? "border-l-[3px] border-l-primary" : "border-l-[3px] border-l-accent",
                        "hover:shadow-lg hover:border-border/60"
                      )}
                    >
                      {isElite && (
                        <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                          Best Value
                        </span>
                      )}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                          <p className="text-xs mt-0.5 text-muted-foreground">Min {Number(plan.min_amount)} IPG</p>
                        </div>
                        <div className="text-right">
                          <p className={cn("text-xl font-bold", isPremiumTier ? "text-primary" : "text-accent")}>
                            {Number(plan.monthly_reward_percent)}%
                          </p>
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Monthly</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/30">
                        <div className="flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground">{plan.lock_period_days} days lock</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground">Auto-compound</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-40 group-hover:opacity-80 transition-opacity text-foreground/60" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ─── My Stakes Tab ─── */}
        {activeTab === 'stakes' && (
          <div className="space-y-3.5">
            {stakesLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : activeStakes.length === 0 ? (
              <div className="p-8 rounded-xl text-center bg-card border border-border/30">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-muted/50">
                  <Coins className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold mb-1 text-foreground/85">No Active Stakes</p>
                <p className="text-xs mb-4 text-muted-foreground">
                  Start staking to earn monthly rewards on your IPG tokens
                </p>
                <Button
                  size="sm"
                  onClick={() => setActiveTab('plans')}
                  className="h-8 text-xs rounded-lg px-5 bg-accent text-accent-foreground"
                >
                  View Plans
                </Button>
              </div>
            ) : (
              activeStakes.map((stake: UserStake) => {
                const planName = stake.plan?.name || 'Stake';
                const isPremiumTier = planName === 'Premium' || planName === 'Elite';
                const lockDate = new Date(stake.lock_until);
                const isLocked = lockDate > new Date();

                return (
                  <div key={stake.id} className={cn(
                    "rounded-xl p-4 bg-card border border-border/40",
                    isPremiumTier ? "border-l-[3px] border-l-primary" : "border-l-[3px] border-l-accent"
                  )}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{planName}</p>
                        <p className="text-[11px] mt-0.5 text-muted-foreground">
                          Staked on {format(new Date(stake.staked_at), 'dd MMM yyyy')}
                        </p>
                      </div>
                      <Badge
                        className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-full border-0",
                          isLocked ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
                        )}
                      >
                        {isLocked ? 'Locked' : 'Unlocked'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">Amount</p>
                        <p className="text-sm font-bold text-foreground">{Number(stake.stake_amount).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">Reward</p>
                        <p className={cn("text-sm font-bold", isPremiumTier ? "text-primary" : "text-accent")}>
                          {Number(stake.monthly_reward_percent)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">Earned</p>
                        <p className="text-sm font-bold text-accent">{Number(stake.total_rewards).toFixed(4)}</p>
                      </div>
                    </div>
                    {isLocked && (
                      <p className="text-[10px] mt-3 pt-2 border-t border-border/30 text-muted-foreground">
                        <Lock className="w-3 h-3 inline mr-1" />
                        Unlocks on {format(lockDate, 'dd MMM yyyy')}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── History Tab ─── */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {ledgerLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : ledger.length === 0 ? (
              <div className="p-8 rounded-xl text-center bg-card border border-border/30">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-muted/50">
                  <History className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold mb-1 text-foreground/85">No Staking History</p>
                <p className="text-xs text-muted-foreground">
                  Your staking transactions will appear here
                </p>
              </div>
            ) : (
              ledger.map((entry: StakingLedgerEntry) => {
                const isPositive = entry.amount > 0;
                const typeLabels: Record<string, string> = {
                  deposit: 'Deposit',
                  stake: 'Staked',
                  unstake: 'Unstaked',
                  reward: 'Reward',
                  withdrawal: 'Withdrawal',
                  fee: 'Fee',
                };
                return (
                  <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/30">
                    <div>
                      <p className="text-xs font-medium text-foreground/85">
                        {typeLabels[entry.tx_type] || entry.tx_type}
                      </p>
                      <p className="text-[10px] mt-0.5 text-muted-foreground">
                        {format(new Date(entry.created_at), 'dd MMM yyyy, HH:mm')}
                      </p>
                    </div>
                    <p className={cn("text-sm font-bold", isPositive ? "text-accent" : "text-danger")}>
                      {isPositive ? '+' : ''}{Number(entry.amount).toFixed(4)} IPG
                    </p>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── Fee Disclosure ─── */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-muted/30 border border-border/20">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-muted-foreground" />
          <div className="text-[11px] leading-relaxed text-muted-foreground">
            <p className="font-medium mb-0.5 text-foreground/85">Fee Structure</p>
            <p>Staking: {stakingFee}% at entry • Unstaking: {unstakingFee}% at withdrawal • Rewards credited monthly</p>
          </div>
        </div>
      </div>
    </div>
  );
}
