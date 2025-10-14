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
  const pending = getPendingReferral();
  if (!pending) return;

  console.log('📋 Capturing referral - sponsorID:', pending.sponsorId);

  try {
    // Get settings
    const { data: settings } = await supabase
      .from('mobile_linking_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!settings) {
      console.warn('No mobile linking settings found');
      return;
    }

    // Check if capture stage matches
    if (settings.capture_stage !== 'after_email_verify') {
      return; // Not the right stage yet
    }

    // Check for self-referral (sponsorId is now the user_id)
    if (settings.self_referral_block && userId === pending.sponsorId) {
      console.warn('❌ Self-referral blocked');
      clearPendingReferral();
      return;
    }

    // Validate sponsor exists in profiles table
    const { data: sponsorProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', pending.sponsorId)
      .maybeSingle();

    if (!sponsorProfile) {
      console.warn('⚠️ Sponsor not found in profiles:', pending.sponsorId);
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

    // Create or update referral link - store the actual readable code
    const { error } = await supabase
      .from('referral_links_new')
      .upsert({
        user_id: userId,
        sponsor_id: pending.sponsorId,
        sponsor_code_used: pending.code, // Store the actual readable code
        locked_at: new Date().toISOString(),
        first_touch_at: new Date(pending.timestamp).toISOString(),
        source: 'manual_entry',
        capture_stage: 'after_email_verify'
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('❌ Error locking referral:', error);
      return;
    }

    console.log('✅ Referral locked to sponsor:', pending.sponsorId);
    clearPendingReferral();
  } catch (error) {
    console.error('Error capturing referral:', error);
  }
}
