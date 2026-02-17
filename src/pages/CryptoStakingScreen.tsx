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

const bg = '#0B1020';
const surface = 'hsla(220, 25%, 11%, 0.8)';
const surfaceSolid = '#121826';
const teal = '#16F2C6';
const violet = '#7C3AED';
const dimText = 'hsl(220, 9%, 55%)';
const bodyText = 'hsl(0, 0%, 85%)';
const brightText = 'hsl(0, 0%, 93%)';

const PLAN_ACCENTS: Record<string, { accent: string; accentAlpha: string }> = {
  'Starter': { accent: teal, accentAlpha: 'hsla(160, 88%, 52%, 0.15)' },
  'Growth': { accent: teal, accentAlpha: 'hsla(160, 88%, 52%, 0.2)' },
  'Premium': { accent: violet, accentAlpha: 'hsla(263, 70%, 50%, 0.18)' },
  'Elite': { accent: violet, accentAlpha: 'hsla(263, 70%, 50%, 0.25)' },
};

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
    <div className="min-h-screen flex flex-col" style={{ background: bg }}>
      <div className="px-4 py-5 space-y-6">
        <BacklinkBar programName="Crypto Staking" parentRoute="/app/home" />

        {/* ─── Hero Section ─── */}
        <div className="relative p-5 rounded-xl overflow-hidden" style={{
          background: surfaceSolid,
          border: '1px solid hsla(160, 50%, 50%, 0.1)',
        }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full opacity-[0.07] pointer-events-none"
            style={{ background: `radial-gradient(circle, ${teal} 0%, transparent 70%)` }} />

          <div className="relative z-10">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] mb-1" style={{ color: dimText }}>
              IPG Staking
            </p>
            <p className="text-[28px] font-bold leading-tight" style={{ color: brightText }}>
              Earn <span style={{ color: teal }}>{minReward}–{maxReward}%</span> Monthly
            </p>

            <div className="flex items-center gap-5 mt-4">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" style={{ color: dimText }} />
                <span className="text-xs font-medium" style={{ color: bodyText }}>{lockDays} Days Lock</span>
              </div>
              <div className="w-px h-4" style={{ background: 'hsla(220, 20%, 30%, 0.5)' }} />
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" style={{ color: dimText }} />
                <span className="text-xs font-medium" style={{ color: bodyText }}>{stakingFee}% Fee</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── How It Works (Collapsible) ─── */}
        <Collapsible open={howOpen} onOpenChange={setHowOpen}>
          <CollapsibleTrigger asChild>
            <button
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium"
              style={{
                background: surfaceSolid,
                color: bodyText,
                border: '1px solid hsla(220, 20%, 25%, 0.4)',
              }}
            >
              <span>How It Works</span>
              <ChevronDown
                className="w-4 h-4 transition-transform duration-200"
                style={{
                  color: dimText,
                  transform: howOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 py-3 mt-1 rounded-lg text-xs leading-relaxed" style={{
              background: surfaceSolid,
              color: dimText,
              border: '1px solid hsla(220, 20%, 25%, 0.3)',
            }}>
              Transfer IPG from your wallet to your staking account, choose a plan, and earn automatic monthly rewards.
              Entry fee: {stakingFee}% • Exit fee: {unstakingFee}% • Rewards auto-compound monthly.
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* ─── Tab Section ─── */}
        <div className="flex items-center gap-6 h-9 px-1" style={{ borderBottom: '1px solid hsla(220, 20%, 25%, 0.3)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="relative pb-2.5 text-sm font-medium transition-colors duration-200"
              style={{
                color: activeTab === tab.key ? brightText : dimText,
              }}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ background: teal }} />
              )}
            </button>
          ))}
        </div>

        {/* ─── Plans Tab ─── */}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            {/* Staking Account Balance */}
            <div className="flex items-center justify-between p-4 rounded-xl" style={{
              background: surface,
              border: '1px solid hsla(160, 50%, 50%, 0.1)',
            }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: 'hsla(160, 50%, 50%, 0.1)' }}>
                  <Wallet className="w-4.5 h-4.5" style={{ color: teal }} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide" style={{ color: dimText }}>Staking Balance</p>
                  <p className="text-lg font-bold" style={{ color: brightText }}>
                    {isLoading ? '...' : `${Number(availableBalance).toFixed(2)} IPG`}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/app/staking/deposit")}
                className="h-8 text-xs font-medium rounded-lg px-4"
                style={{
                  background: 'transparent',
                  borderColor: 'hsla(160, 50%, 50%, 0.25)',
                  color: teal,
                }}
              >
                Fund
              </Button>
            </div>

            {/* Staked & Earned Summary */}
            {(stakedBalance > 0 || totalEarned > 0) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl" style={{ background: surfaceSolid, border: '1px solid hsla(220, 20%, 25%, 0.3)' }}>
                  <p className="text-[10px] uppercase tracking-wide" style={{ color: dimText }}>Total Staked</p>
                  <p className="text-base font-bold mt-0.5" style={{ color: brightText }}>{Number(stakedBalance).toFixed(2)} IPG</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: surfaceSolid, border: '1px solid hsla(220, 20%, 25%, 0.3)' }}>
                  <p className="text-[10px] uppercase tracking-wide" style={{ color: dimText }}>Total Earned</p>
                  <p className="text-base font-bold mt-0.5" style={{ color: teal }}>{Number(totalEarned).toFixed(2)} IPG</p>
                </div>
              </div>
            )}

            {/* Plan List */}
            <div className="space-y-3.5">
              <p className="text-xs font-medium uppercase tracking-[0.1em]" style={{ color: dimText }}>
                Choose a Plan
              </p>

              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: dimText }} />
                </div>
              ) : plans.length === 0 ? (
                <div className="p-6 rounded-xl text-center" style={{ background: surfaceSolid, border: '1px solid hsla(220, 20%, 25%, 0.3)' }}>
                  <p className="text-sm" style={{ color: dimText }}>No staking plans available</p>
                </div>
              ) : (
                plans.map((plan) => {
                  const colors = PLAN_ACCENTS[plan.name] || { accent: teal, accentAlpha: 'hsla(160, 88%, 52%, 0.15)' };
                  const isElite = plan.name === 'Elite';
                  return (
                    <button
                      key={plan.id}
                      onClick={() => handleSelectPlan(plan.id)}
                      className="w-full text-left relative rounded-xl p-4 transition-all duration-200 group"
                      style={{
                        background: surfaceSolid,
                        border: '1px solid hsla(220, 20%, 25%, 0.4)',
                        borderLeft: `3px solid ${colors.accent}`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = `0 0 20px ${colors.accentAlpha}`;
                        e.currentTarget.style.borderColor = `hsla(220, 20%, 30%, 0.6)`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = 'hsla(220, 20%, 25%, 0.4)';
                      }}
                    >
                      {isElite && (
                        <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ background: 'hsla(263, 70%, 50%, 0.2)', color: '#A78BFA' }}>
                          Best Value
                        </span>
                      )}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: brightText }}>{plan.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: dimText }}>Min {Number(plan.min_amount)} IPG</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold" style={{ color: colors.accent }}>{Number(plan.monthly_reward_percent)}%</p>
                          <p className="text-[10px] uppercase tracking-wide" style={{ color: dimText }}>Monthly</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: '1px solid hsla(220, 20%, 25%, 0.3)' }}>
                        <div className="flex items-center gap-1.5">
                          <Lock className="w-3 h-3" style={{ color: dimText }} />
                          <span className="text-[11px]" style={{ color: dimText }}>{plan.lock_period_days} days lock</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-3 h-3" style={{ color: dimText }} />
                          <span className="text-[11px]" style={{ color: dimText }}>Auto-compound</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-40 group-hover:opacity-80 transition-opacity" style={{ color: bodyText }} />
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
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: dimText }} />
              </div>
            ) : activeStakes.length === 0 ? (
              <div className="p-8 rounded-xl text-center" style={{
                background: surfaceSolid,
                border: '1px solid hsla(220, 20%, 25%, 0.3)',
              }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'hsla(220, 20%, 25%, 0.3)' }}>
                  <Coins className="w-6 h-6" style={{ color: dimText }} />
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: bodyText }}>No Active Stakes</p>
                <p className="text-xs mb-4" style={{ color: dimText }}>
                  Start staking to earn monthly rewards on your IPG tokens
                </p>
                <Button
                  size="sm"
                  onClick={() => setActiveTab('plans')}
                  className="h-8 text-xs rounded-lg px-5"
                  style={{ background: teal, color: '#0B1020' }}
                >
                  View Plans
                </Button>
              </div>
            ) : (
              activeStakes.map((stake: UserStake) => {
                const planName = stake.plan?.name || 'Stake';
                const colors = PLAN_ACCENTS[planName] || { accent: teal, accentAlpha: 'hsla(160, 88%, 52%, 0.15)' };
                const lockDate = new Date(stake.lock_until);
                const isLocked = lockDate > new Date();

                return (
                  <div key={stake.id} className="rounded-xl p-4" style={{
                    background: surfaceSolid,
                    border: '1px solid hsla(220, 20%, 25%, 0.4)',
                    borderLeft: `3px solid ${colors.accent}`,
                  }}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: brightText }}>{planName}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: dimText }}>
                          Staked on {format(new Date(stake.staked_at), 'dd MMM yyyy')}
                        </p>
                      </div>
                      <Badge
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full border-0"
                        style={{
                          background: isLocked ? 'hsla(40, 80%, 50%, 0.15)' : 'hsla(160, 80%, 50%, 0.15)',
                          color: isLocked ? '#F59E0B' : teal,
                        }}
                      >
                        {isLocked ? 'Locked' : 'Unlocked'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-[10px] uppercase" style={{ color: dimText }}>Amount</p>
                        <p className="text-sm font-bold" style={{ color: brightText }}>{Number(stake.stake_amount).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase" style={{ color: dimText }}>Reward</p>
                        <p className="text-sm font-bold" style={{ color: colors.accent }}>{Number(stake.monthly_reward_percent)}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase" style={{ color: dimText }}>Earned</p>
                        <p className="text-sm font-bold" style={{ color: teal }}>{Number(stake.total_rewards).toFixed(4)}</p>
                      </div>
                    </div>
                    {isLocked && (
                      <p className="text-[10px] mt-3 pt-2" style={{ color: dimText, borderTop: '1px solid hsla(220, 20%, 25%, 0.3)' }}>
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
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: dimText }} />
              </div>
            ) : ledger.length === 0 ? (
              <div className="p-8 rounded-xl text-center" style={{
                background: surfaceSolid,
                border: '1px solid hsla(220, 20%, 25%, 0.3)',
              }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'hsla(220, 20%, 25%, 0.3)' }}>
                  <History className="w-6 h-6" style={{ color: dimText }} />
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: bodyText }}>No Staking History</p>
                <p className="text-xs" style={{ color: dimText }}>
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
                  <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg" style={{
                    background: surfaceSolid,
                    border: '1px solid hsla(220, 20%, 25%, 0.3)',
                  }}>
                    <div>
                      <p className="text-xs font-medium" style={{ color: bodyText }}>
                        {typeLabels[entry.tx_type] || entry.tx_type}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: dimText }}>
                        {format(new Date(entry.created_at), 'dd MMM yyyy, HH:mm')}
                      </p>
                    </div>
                    <p className="text-sm font-bold" style={{ color: isPositive ? teal : '#EF4444' }}>
                      {isPositive ? '+' : ''}{Number(entry.amount).toFixed(4)} IPG
                    </p>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── Fee Disclosure ─── */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg" style={{
          background: 'hsla(220, 25%, 11%, 0.5)',
          border: '1px solid hsla(220, 20%, 25%, 0.2)',
        }}>
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: dimText }} />
          <div className="text-[11px] leading-relaxed" style={{ color: dimText }}>
            <p className="font-medium mb-0.5" style={{ color: bodyText }}>Fee Structure</p>
            <p>Staking: {stakingFee}% at entry • Unstaking: {unstakingFee}% at withdrawal • Rewards credited monthly</p>
          </div>
        </div>
      </div>
    </div>
  );
}
