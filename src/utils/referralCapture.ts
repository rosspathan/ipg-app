import { supabase } from "@/integrations/supabase/client";

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
 * Capture and lock referral at the configured stage
 * Called after email verification (default)
 */
export async function captureReferralAfterEmailVerify(userId: string): Promise<void> {
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

    if (!settings) {
      console.error('[ReferralCapture] ✗ CRITICAL: No mobile_linking_settings found! Referral capture will not work.');
      console.error('[ReferralCapture] ✗ Admin must create a mobile_linking_settings row with capture_stage = "after_email_verify"');
      return;
    }

    // Check if capture stage matches
    if (settings.capture_stage !== 'after_email_verify') {
      console.log('[ReferralCapture] ℹ Skipping: capture_stage is', settings.capture_stage, '(need after_email_verify)');
      return;
    }

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
          capture_stage: 'after_email_verify',
          first_touch_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error('[ReferralCapture] Failed to insert referral link:', insertError);
        return;
      }
      
    console.log('[ReferralCapture] ✓ Created and locked new referral link');
      
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
        capture_stage: 'after_email_verify'
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
    console.log('[ReferralCapture] ✓ Tree will be auto-built by database trigger');
    
    // Clear BOTH storage locations
    clearPendingReferral();
    localStorage.removeItem('ismart_signup_ref');
  } catch (error) {
    console.error('[ReferralCapture] ✗ Error capturing referral:', error);
  }
}
