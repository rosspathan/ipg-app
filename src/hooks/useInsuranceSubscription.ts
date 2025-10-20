import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuthUser } from '@/hooks/useAuthUser';

export interface InsurancePlan {
  id: string;
  name: string;
  price: number;
  coverage: string;
  maxClaim: number;
  features: string[];
}

export function useInsuranceSubscription() {
  const { user } = useAuthUser();
  const [subscribing, setSubscribing] = useState(false);

  const subscribe = async (plan: InsurancePlan) => {
    if (!user?.id) {
      toast.error('Please sign in to subscribe');
      return;
    }

    setSubscribing(true);
    try {
      // Check user's BSK balance
      const { data: balanceData } = await supabase
        .from('user_bsk_balances')
        .select('withdrawable_balance')
        .eq('user_id', user.id)
        .single();

      const balance = Number(balanceData?.withdrawable_balance || 0);

      if (balance < plan.price) {
        toast.error('Insufficient BSK balance', {
          description: `You need ${plan.price} BSK to subscribe to this plan`,
        });
        return;
      }

      // Find the insurance tier
      const { data: tier } = await supabase
        .from('insurance_subscription_tiers')
        .select('*')
        .eq('tier_name', plan.name)
        .single();

      if (!tier) {
        toast.error('Insurance plan not found');
        return;
      }

      // Create subscription record
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const { error: subError } = await supabase
        .from('user_insurance_subscriptions')
        .insert([{
          user_id: user.id,
          tier_id: tier.id,
          expires_at: expiresAt.toISOString(),
          subscribed_at: new Date().toISOString(),
          claims_used_this_month: 0,
          is_active: true,
        }]);

      if (subError) throw subError;

      // Deduct BSK from balance
      const { error: balanceError } = await supabase
        .from('user_bsk_balances')
        .update({
          withdrawable_balance: balance - plan.price,
        })
        .eq('user_id', user.id);

      if (balanceError) throw balanceError;

      // Log transaction
      await supabase.from('insurance_bsk_ledger').insert([{
        user_id: user.id,
        type: 'insurance_subscription',
        bsk_amount: -plan.price,
        inr_amount: 0,
        plan_type: plan.name,
        rate_snapshot: 1,
      }]);

      toast.success('Subscription successful!', {
        description: `You are now subscribed to ${plan.name}`,
      });
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error('Subscription failed', {
        description: error.message || 'Please try again',
      });
    } finally {
      setSubscribing(false);
    }
  };

  return {
    subscribe,
    subscribing,
  };
}
