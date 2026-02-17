import * as React from "react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BacklinkBar } from "@/components/programs-pro/BacklinkBar";
import { Lock, TrendingUp, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { useNavigation } from "@/hooks/useNavigation";
import { useCryptoStakingAccount } from "@/hooks/useCryptoStakingAccount";
import { toast } from "sonner";

const bg = '#0B1020';
const surfaceSolid = '#121826';
const teal = '#16F2C6';
const violet = '#7C3AED';
const dimText = 'hsl(220, 9%, 55%)';
const bodyText = 'hsl(0, 0%, 85%)';
const brightText = 'hsl(0, 0%, 93%)';

const PLAN_ACCENTS: Record<string, string> = {
  'Starter': teal,
  'Growth': teal,
  'Premium': violet,
  'Elite': violet,
};

export default function CryptoStakingPlanDetail() {
  const { planId } = useParams<{ planId: string }>();
  const { navigate } = useNavigation();
  const [amount, setAmount] = useState('');

  const {
    plans,
    isLoading,
    availableBalance,
    stakingFee,
    createStake,
    isStaking,
  } = useCryptoStakingAccount();

  const plan = plans.find(p => p.id === planId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: dimText }} />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: bg }}>
        <div className="px-4 py-5">
          <BacklinkBar programName="Plan Not Found" parentRoute="/app/staking" />
          <div className="text-center mt-10">
            <p className="text-sm" style={{ color: dimText }}>This staking plan is not available.</p>
            <Button onClick={() => navigate('/app/staking')} className="mt-4" size="sm" style={{ background: teal, color: bg }}>
              Back to Plans
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const accent = PLAN_ACCENTS[plan.name] || teal;
  const minAmount = Number(plan.min_amount);
  const maxAmount = plan.max_amount ? Number(plan.max_amount) : null;
  const rewardPercent = Number(plan.monthly_reward_percent);
  const numericAmount = Number(amount) || 0;
  const feeAmount = numericAmount * (stakingFee / 100);
  const netStaked = numericAmount - feeAmount;
  const monthlyReward = netStaked * (rewardPercent / 100);
  const canStake = numericAmount >= minAmount && numericAmount <= availableBalance && (!maxAmount || numericAmount <= maxAmount);

  const handleStake = () => {
    if (!canStake) return;
    createStake(
      { planId: plan.id, amount: numericAmount },
      {
        onSuccess: () => {
          navigate('/app/staking');
        },
      }
    );
  };

  const handleMax = () => {
    const max = maxAmount ? Math.min(availableBalance, maxAmount) : availableBalance;
    setAmount(max > 0 ? String(Number(max.toFixed(8))) : '');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: bg }}>
      <div className="px-4 py-5 space-y-6">
        <BacklinkBar programName={`${plan.name} Plan`} parentRoute="/app/staking" />

        {/* Plan Header */}
        <div className="relative p-5 rounded-xl overflow-hidden" style={{
          background: surfaceSolid,
          border: `1px solid ${accent}33`,
          borderLeft: `3px solid ${accent}`,
        }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold" style={{ color: brightText }}>{plan.name}</p>
              <p className="text-xs mt-0.5" style={{ color: dimText }}>
                Min {minAmount} IPG {maxAmount ? `• Max ${maxAmount} IPG` : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold" style={{ color: accent }}>{rewardPercent}%</p>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: dimText }}>Monthly</p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 pt-3" style={{ borderTop: '1px solid hsla(220, 20%, 25%, 0.3)' }}>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3 h-3" style={{ color: dimText }} />
              <span className="text-[11px]" style={{ color: dimText }}>{plan.lock_period_days} days lock</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" style={{ color: dimText }} />
              <span className="text-[11px]" style={{ color: dimText }}>Auto-compound</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3" style={{ color: dimText }} />
              <span className="text-[11px]" style={{ color: dimText }}>{stakingFee}% entry fee</span>
            </div>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: dimText }}>Stake Amount</p>
            <p className="text-xs" style={{ color: dimText }}>
              Available: <span style={{ color: bodyText }}>{Number(availableBalance).toFixed(4)} IPG</span>
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="number"
                placeholder={`Min ${minAmount} IPG`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-12 text-base font-medium pr-14"
                style={{
                  background: surfaceSolid,
                  border: '1px solid hsla(220, 20%, 25%, 0.4)',
                  color: brightText,
                }}
                min={minAmount}
                step="0.01"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium" style={{ color: dimText }}>
                IPG
              </span>
            </div>
            <Button
              variant="outline"
              onClick={handleMax}
              className="h-12 px-4 text-xs font-medium"
              style={{ borderColor: `${accent}40`, color: accent, background: 'transparent' }}
            >
              MAX
            </Button>
          </div>

          {numericAmount > 0 && numericAmount < minAmount && (
            <p className="text-[11px]" style={{ color: '#EF4444' }}>
              Minimum stake amount is {minAmount} IPG
            </p>
          )}
          {numericAmount > availableBalance && (
            <p className="text-[11px]" style={{ color: '#EF4444' }}>
              Insufficient balance. <button onClick={() => navigate('/app/staking/deposit')} className="underline" style={{ color: accent }}>Fund account</button>
            </p>
          )}
          {maxAmount && numericAmount > maxAmount && (
            <p className="text-[11px]" style={{ color: '#EF4444' }}>
              Maximum stake for this plan is {maxAmount} IPG
            </p>
          )}
        </div>

        {/* Summary */}
        {numericAmount >= minAmount && (
          <div className="rounded-xl p-4 space-y-3" style={{
            background: surfaceSolid,
            border: '1px solid hsla(220, 20%, 25%, 0.3)',
          }}>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: dimText }}>Summary</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: dimText }}>Stake Amount</span>
                <span style={{ color: bodyText }}>{numericAmount.toFixed(4)} IPG</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: dimText }}>Entry Fee ({stakingFee}%)</span>
                <span style={{ color: '#EF4444' }}>-{feeAmount.toFixed(4)} IPG</span>
              </div>
              <div className="flex justify-between text-sm pt-2" style={{ borderTop: '1px solid hsla(220, 20%, 25%, 0.3)' }}>
                <span style={{ color: dimText }}>Net Staked</span>
                <span className="font-semibold" style={{ color: brightText }}>{netStaked.toFixed(4)} IPG</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: dimText }}>Est. Monthly Reward</span>
                <span className="font-semibold" style={{ color: accent }}>+{monthlyReward.toFixed(4)} IPG</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: dimText }}>Lock Until</span>
                <span style={{ color: bodyText }}>
                  {new Date(Date.now() + plan.lock_period_days * 86400000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Stake Button */}
        <Button
          onClick={handleStake}
          disabled={!canStake || isStaking}
          className="w-full h-12 text-sm font-semibold rounded-xl"
          style={{
            background: canStake ? accent : 'hsla(220, 20%, 25%, 0.5)',
            color: canStake ? bg : dimText,
          }}
        >
          {isStaking ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
          ) : (
            <><Lock className="w-4 h-4 mr-2" /> Confirm Stake</>
          )}
        </Button>

        {/* Warning */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg" style={{
          background: 'hsla(40, 80%, 50%, 0.06)',
          border: '1px solid hsla(40, 80%, 50%, 0.15)',
        }}>
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
          <div className="text-[11px] leading-relaxed" style={{ color: dimText }}>
            <p className="font-medium mb-0.5" style={{ color: '#F59E0B' }}>Important</p>
            <p>Your IPG will be locked for {plan.lock_period_days} days. Early withdrawal incurs an unstaking fee. Rewards auto-compound monthly.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
