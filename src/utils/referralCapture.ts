import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PendingReferral {
  code: string;
  sponsorId: string;
  timestamp: number;
}

/**
 * Store pending referral in localStorage
 */
export function storePendingReferral(code: string, sponsorId: string): void {
  const pending: PendingReferral = {
    code: code.toUpperCase(),
    sponsorId,
    timestamp: Date.now()
  };
  localStorage.setItem('ismart_pending_ref', JSON.stringify(pending));
}

/**
 * Get pending referral from localStorage
 */
export function getPendingReferral(): PendingReferral | null {
  try {
    const stored = localStorage.getItem('ismart_pending_ref');
    if (!stored) return null;
    
    const pending = JSON.parse(stored) as PendingReferral;
    
    // Expire after 30 days
    const daysSince = (Date.now() - pending.timestamp) / (1000 * 60 * 60 * 24);
    if (daysSince > 30) {
      clearPendingReferral();
      return null;
    }
    
    return pending;
  } catch (error) {
    console.error('Error parsing pending referral:', error);
    return null;
  }
}

/**
 * Clear pending referral from localStorage
 */
export function clearPendingReferral(): void {
  localStorage.removeItem('ismart_pending_ref');
}

/**
 * Safety net: Ensure referral is captured even if initial capture failed
 * Can be called multiple times safely - won't duplicate if already locked
 */
export async function ensureReferralCaptured(userId: string): Promise<void> {
  try {
    console.log('[ReferralSafetyNet] Checking referral status for user:', userId);

    // Check if user already has a locked sponsor
    const { data: existingLink } = await supabase
      .from('referral_links_new')
      .select('sponsor_id, locked_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingLink?.locked_at) {
      console.log('[ReferralSafetyNet] ✓ User already has locked sponsor:', existingLink.sponsor_id);
      return;
    }

    // Check if there's a pending referral code
    const signupCode = localStorage.getItem('ismart_signup_ref');
    const pending = getPendingReferral();

    if (!signupCode && !pending) {
      console.log('[ReferralSafetyNet] ℹ No pending referral code found');
      return;
    }

    console.log('[ReferralSafetyNet] ⚠️ Found pending referral, attempting capture...');
    
    // Attempt full capture
    await captureReferralAfterSignup(userId);
    
  } catch (error) {
    console.error('[ReferralSafetyNet] Error:', error);
  }
}

/**
 * Capture and lock referral after signup (works with or without email verification)
 * Called after user signs in for the first time
 */
export async function captureReferralAfterSignup(userId: string): Promise<void> {
  try {
    console.log('[ReferralCapture] ✓ Starting capture for userId:', userId);

    // Read any code the user typed during signup or from pending storage
    const signupCode = (localStorage.getItem('ismart_signup_ref') || '').toUpperCase().trim();
    const pending = getPendingReferral();
    let referralCode = (signupCode || pending?.code || '').toUpperCase().trim();

    if (!referralCode) {
      console.log('[ReferralCapture] ℹ No referral code entered - user signing up without sponsor');
      return;
    }

    console.log('[ReferralCapture] ↪ Using referral code:', referralCode, {
      fromSignup: !!signupCode,
      fromPending: !!pending?.code
    });

    // Load optional settings to get capture stage
    const { data: settings } = await supabase
      .from('mobile_linking_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const captureStage = settings?.capture_stage || 'after_signup';
    console.log('[ReferralCapture] ℹ Using capture stage:', captureStage);

    // Try server-side lock via Edge Function FIRST to avoid RLS/race conditions
    try {
      console.log('[ReferralCapture] → Invoking lock-referral with referral_code');
      const { data: lockResult, error: lockError } = await supabase.functions.invoke('lock-referral', {
        body: { referral_code: referralCode, capture_stage: captureStage }
      });

      if (!lockError && (lockResult?.success || lockResult?.status === 'locked' || lockResult?.status === 'already_locked')) {
        console.log('[ReferralCapture] ✓ Locked via edge function');
        // Build referral tree immediately (non-blocking)
        try {
          await supabase.functions.invoke('build-referral-tree', { body: { user_id: userId, include_unlocked: false } });
          console.log('[ReferralCapture] ✓ Tree built for user:', userId);
        } catch (e) {
          console.warn('[ReferralCapture] Tree build failed (non-blocking):', e);
        }
        toast.success('Referral connection established successfully!');
        clearPendingReferral();
        localStorage.removeItem('ismart_signup_ref');
        return;
      }

      const explicitError = (lockError?.message || lockResult?.error || '').toLowerCase();
      if (explicitError.includes('invalid referral code')) {
        console.warn('[ReferralCapture] ✗ Invalid referral code via edge function');
        // Let user know and clean up
        // sonner supports toast.error
        // If not available in some themes, it's a no-op
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (typeof toast.error === 'function') {
          // @ts-ignore
          toast.error('Invalid referral code');
        } else {
          toast('Invalid referral code');
        }
        clearPendingReferral();
        localStorage.removeItem('ismart_signup_ref');
        return;
      }

      if (lockError) {
        console.warn('[ReferralCapture] Edge lock failed, will try client fallback:', lockError);
      }
    } catch (e) {
      console.warn('[ReferralCapture] Edge lock threw, will try client fallback:', e);
    }

    // CLIENT FALLBACK: resolve sponsor and lock on the client (RLS must allow)
    let sponsorId: string | null = pending?.sponsorId || null;
    let sponsorCodeUsed = referralCode;

    if (!sponsorId) {
      const { data: sponsorByCode } = await supabase
        .from('profiles')
        .select('user_id, referral_code')
        .eq('referral_code', referralCode)
        .maybeSingle();

      if (!sponsorByCode) {
        console.warn('[ReferralCapture] ✗ Sponsor not found for code (fallback failed):', referralCode);
        return;
      }
      sponsorId = sponsorByCode.user_id;
      sponsorCodeUsed = sponsorByCode.referral_code;
    }

    // Optional self-referral block if settings demand it (edge function blocks anyway)
    if (settings?.self_referral_block && userId === sponsorId) {
      console.log('[ReferralCapture] Blocked self-referral attempt');
      clearPendingReferral();
      return;
    }

    // Check if user already has a locked sponsor
    const { data: existingLink } = await supabase
      .from('referral_links_new')
      .select('id, sponsor_id, locked_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingLink?.locked_at) {
      console.log('[ReferralCapture] ℹ Already locked to sponsor:', existingLink.sponsor_id);
      clearPendingReferral();
      localStorage.removeItem('ismart_signup_ref');
      return;
    }

    const now = new Date().toISOString();

    if (!existingLink) {
      console.log('[ReferralCapture] → Creating new referral link (fallback)');
      const { error: insertError } = await supabase
        .from('referral_links_new')
        .insert({
          user_id: userId,
          sponsor_id: sponsorId!,
          sponsor_code_used: sponsorCodeUsed,
          locked_at: now,
          capture_stage: captureStage,
          first_touch_at: now
        });
      if (insertError) {
        console.error('[ReferralCapture] ✗ Failed to insert referral link:', insertError);
        return;
      }
    } else {
      console.log('[ReferralCapture] → Updating and locking existing referral link (fallback)');
      const { error: updateError } = await supabase
        .from('referral_links_new')
        .update({
          sponsor_id: sponsorId!,
          sponsor_code_used: sponsorCodeUsed,
          locked_at: now,
          capture_stage: captureStage
        })
        .eq('user_id', userId)
        .is('locked_at', null);
      if (updateError) {
        console.error('[ReferralCapture] ✗ Failed to lock referral (update):', updateError);
        return;
      }
    }

    // Build tree and finish
    try {
      await supabase.functions.invoke('build-referral-tree', {
        body: { user_id: userId, include_unlocked: false }
      });
      console.log('[ReferralCapture] ✓ Tree built for user:', userId);
    } catch (treeErr) {
      console.warn('[ReferralCapture] Tree build failed (non-blocking):', treeErr);
    }

    toast.success('Referral connection established successfully!');
    clearPendingReferral();
    localStorage.removeItem('ismart_signup_ref');
  } catch (error) {
    console.error('[ReferralCapture] ✗ Error capturing referral:', error);
  }
}
