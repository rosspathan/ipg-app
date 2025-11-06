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
    
    let sponsorId: string | null = null;
    let referralCode: string | null = null;

    // Priority 1: Check signup referral code (directly entered during signup)
    const storedCode = localStorage.getItem('ismart_signup_ref');
    if (storedCode) {
      referralCode = storedCode.toUpperCase();
      console.log('[ReferralCapture] ✓ Using signup referral code:', referralCode);
      
      // Lookup sponsor by code
      const { data } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('referral_code', referralCode)
        .maybeSingle();
      
      if (data) {
        sponsorId = data.user_id;
        console.log('[ReferralCapture] ✓ Resolved sponsor:', sponsorId);
      } else {
        console.warn('[ReferralCapture] ✗ Invalid referral code:', referralCode);
        localStorage.removeItem('ismart_signup_ref');
        return;
      }
    }

    // Priority 2: Check onboarding referral (fallback)
    if (!sponsorId) {
      const pending = getPendingReferral();
      if (pending && pending.code) {
        referralCode = pending.code;
        sponsorId = pending.sponsorId;
        console.log('[ReferralCapture] ✓ Using onboarding referral:', referralCode, '→', sponsorId);
      }
    }

    if (!sponsorId) {
      console.log('[ReferralCapture] ℹ No referral code entered - user signing up without sponsor');
      return;
    }

    console.log('[ReferralCapture] ✓ Processing sponsor:', sponsorId);

    // Get settings
    const { data: settings } = await supabase
      .from('mobile_linking_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Settings are optional - if none exist, proceed with capture
    const captureStage = settings?.capture_stage || 'after_signup';
    console.log('[ReferralCapture] ℹ Using capture stage:', captureStage);

    // Check for self-referral
    if (settings.self_referral_block && userId === sponsorId) {
      console.log('[ReferralCapture] Blocked self-referral attempt');
      clearPendingReferral();
      return;
    }

    // Validate sponsor exists in profiles table
    const { data: sponsorProfile } = await supabase
      .from('profiles')
      .select('user_id, referral_code')
      .eq('user_id', sponsorId)
      .maybeSingle();

    if (!sponsorProfile) {
      console.log('[ReferralCapture] Sponsor not found in profiles:', sponsorId);
      clearPendingReferral();
      return;
    }

    // Check if user already has a locked sponsor
    const { data: existingLink } = await supabase
      .from('referral_links_new')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingLink && existingLink.locked_at) {
      console.log('User already has locked sponsor:', existingLink.sponsor_id);
      clearPendingReferral();
      return;
    }

    // If no link exists at all, create it (fallback)
    if (!existingLink) {
      console.log('[ReferralCapture] No referral link found, creating new one');
      
      const { error: insertError } = await supabase
        .from('referral_links_new')
        .insert({
          user_id: userId,
          sponsor_id: sponsorId,
          sponsor_code_used: sponsorProfile.referral_code,
          locked_at: new Date().toISOString(),
          capture_stage: captureStage,
          first_touch_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error('[ReferralCapture] Failed to insert referral link:', insertError);
        return;
      }
      
    console.log('[ReferralCapture] ✓ Created and locked new referral link');
      
      // Show success feedback
      toast.success('Welcome bonus activated! You\'re now connected to your sponsor.');
      
      // Build referral tree immediately after locking
      try {
        await supabase.functions.invoke('build-referral-tree', {
          body: { user_id: userId, include_unlocked: false }
        });
        console.log('[ReferralCapture] ✓ Tree built for user:', userId);
      } catch (treeErr) {
        console.warn('[ReferralCapture] Tree build failed (non-blocking):', treeErr);
      }
      
      // Clear BOTH storage locations
      clearPendingReferral();
      localStorage.removeItem('ismart_signup_ref');
      return;
    }

    // Lock the existing referral
    const { error: updateError } = await supabase
      .from('referral_links_new')
      .update({
        sponsor_id: sponsorId,
        sponsor_code_used: sponsorProfile.referral_code || sponsorId,
        locked_at: new Date().toISOString(),
        capture_stage: captureStage
      })
      .eq('user_id', userId)
      .is('locked_at', null);

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        console.log('[ReferralCapture] No unlocked record found - may already be locked');
      } else {
        console.error('[ReferralCapture] Failed to lock referral:', updateError);
      }
      return;
    }

    console.log('[ReferralCapture] ✓ Successfully locked referral to sponsor:', sponsorId);
    
    // Build referral tree immediately after locking
    try {
      await supabase.functions.invoke('build-referral-tree', {
        body: { user_id: userId, include_unlocked: false }
      });
      console.log('[ReferralCapture] ✓ Tree built for user:', userId);
    } catch (treeErr) {
      console.warn('[ReferralCapture] Tree build failed (non-blocking):', treeErr);
    }
    
    // Show success feedback
    toast.success('Referral connection established successfully!');
    
    // Clear BOTH storage locations
    clearPendingReferral();
    localStorage.removeItem('ismart_signup_ref');
  } catch (error) {
    console.error('[ReferralCapture] ✗ Error capturing referral:', error);
  }
}
