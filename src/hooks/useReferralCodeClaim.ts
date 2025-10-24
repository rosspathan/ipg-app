import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthUser } from '@/hooks/useAuthUser';

interface ClaimResult {
  success: boolean;
  error?: string;
}

export function useReferralCodeClaim() {
  const [claiming, setClaiming] = useState(false);
  const { user } = useAuthUser();
  const { toast } = useToast();

  const checkEligibility = async (): Promise<{ eligible: boolean; reason?: string }> => {
    if (!user) {
      return { eligible: false, reason: 'Not authenticated' };
    }

    try {
      // Check if user already has a locked sponsor
      const { data: existingLink, error: linkError } = await supabase
        .from('referral_links_new')
        .select('sponsor_id, locked_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (linkError) throw linkError;

      if (existingLink?.sponsor_id && existingLink?.locked_at) {
        return { eligible: false, reason: 'You already have a sponsor' };
      }

      // Check grace period (7 days from account creation)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      const accountAge = Date.now() - new Date(profile.created_at).getTime();
      const gracePeriodMs = 7 * 24 * 60 * 60 * 1000; // 7 days

      if (accountAge > gracePeriodMs) {
        return { eligible: false, reason: 'Grace period expired (7 days)' };
      }

      return { eligible: true };
    } catch (error) {
      console.error('Error checking eligibility:', error);
      return { eligible: false, reason: 'Failed to check eligibility' };
    }
  };

  const claimReferralCode = async (code: string, sponsorId: string): Promise<ClaimResult> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    setClaiming(true);

    try {
      // Double-check eligibility
      const eligibility = await checkEligibility();
      if (!eligibility.eligible) {
        return { success: false, error: eligibility.reason };
      }

      // Prevent self-referral
      if (sponsorId === user.id) {
        return { success: false, error: 'You cannot refer yourself' };
      }

      // Lock the referral
      const { error: lockError } = await supabase
        .from('referral_links_new')
        .upsert({
          user_id: user.id,
          sponsor_id: sponsorId,
          sponsor_code_used: code,
          locked_at: new Date().toISOString(),
          source: 'post_signup_claim'
        });

      if (lockError) throw lockError;

      // Trigger tree rebuild
      const { error: rebuildError } = await supabase.functions.invoke('build-referral-tree', {
        body: { user_id: user.id }
      });

      if (rebuildError) {
        console.error('Tree rebuild error:', rebuildError);
        // Don't fail the claim if tree rebuild fails
      }

      // Log the claim for tracking
      console.log('Post-signup referral claim:', {
        user_id: user.id,
        sponsor_id: sponsorId,
        referral_code: code,
        source: 'post_signup_claim'
      });

      toast({
        title: 'Success!',
        description: 'Your referral code has been claimed successfully.',
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error claiming referral code:', error);
      return { success: false, error: error.message || 'Failed to claim referral code' };
    } finally {
      setClaiming(false);
    }
  };

  return {
    claiming,
    checkEligibility,
    claimReferralCode
  };
}
