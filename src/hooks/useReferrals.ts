import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useToast } from '@/hooks/use-toast';
import { openUrl } from '@/utils/linkHandler';
import { extractUsernameFromEmail } from '@/lib/user/username';

export interface ReferralCode {
  id: string;
  user_id: string;
  code: string;
  created_at: string;
}

export interface MobileLinkingSettings {
  id: string;
  host: string;
  ref_base_path: string;
  capture_stage: 'on_first_open' | 'after_email_verify' | 'after_wallet_create';
  lock_policy: 'email_verified' | 'first_touch_wins' | 'wallet_created';
  allow_sponsor_change_before_lock: boolean;
  self_referral_block: boolean;
  code_length: number;
  android_package_name_release?: string;
  sha256_fingerprints_release?: string[];
  android_package_name_debug?: string;
  sha256_fingerprints_debug?: string[];
  custom_scheme: string;
  play_store_fallback_url?: string;
  whatsapp_template: string;
  created_at: string;
  updated_at: string;
}

export const useReferrals = () => {
  const { user } = useAuthUser();
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [settings, setSettings] = useState<MobileLinkingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total_referrals: 0, total_commissions: 0 });

  const fetchReferrals = async () => {
    try {
      setLoading(true);

      // Fetch settings (available publicly)
      const { data: settingsData } = await supabase
        .from('mobile_linking_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (settingsData) {
        setSettings(settingsData as MobileLinkingSettings);
      }

      // Determine referral code
      if (user) {
        // Fetch referral code directly from profiles
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('referral_code, user_id')
          .eq('user_id', user.id)
          .single();

        if (profileError) {
          console.error('Error getting referral code:', profileError);
        }

        const actualCode = profileData?.referral_code || user.id.substring(0, 8).toUpperCase();

        setReferralCode({
          id: user.id,
          user_id: user.id,
          code: actualCode,
          created_at: new Date().toISOString()
        });

        // Fetch stats from referral_links_new
        const { data: linkData } = await supabase
          .from('referral_links_new')
          .select('total_referrals, total_commissions')
          .eq('user_id', user.id)
          .maybeSingle();

        if (linkData) {
          setStats({
            total_referrals: linkData.total_referrals || 0,
            total_commissions: linkData.total_commissions || 0
          });
        }
      } else {
        // Fallback: derive a local referral code from verified email or device id
        let localCode = '';
        try {
          const verifyEmail = typeof window !== 'undefined' ? sessionStorage.getItem('verificationEmail') : null;
          let onboardingEmail: string | undefined;
          if (typeof window !== 'undefined') {
            const raw = localStorage.getItem('ipg_onboarding_state');
            if (raw) onboardingEmail = (JSON.parse(raw)?.email as string | undefined) || undefined;
          }
          const { extractUsernameFromEmail } = await import('@/lib/user/username');
          const username = extractUsernameFromEmail(verifyEmail || onboardingEmail || null);
          if (username && username.toLowerCase() !== 'user') {
            localCode = username.toUpperCase();
          }
        } catch {}

        if (!localCode && typeof window !== 'undefined') {
          let deviceId = localStorage.getItem('ipg_device_id');
          if (!deviceId) {
            deviceId = `dev${Math.random().toString(36).slice(2, 10)}`;
            localStorage.setItem('ipg_device_id', deviceId);
          }
          localCode = deviceId.slice(-8).toUpperCase();
        }

        setReferralCode({
          id: 'local',
          user_id: 'local',
          code: localCode,
          created_at: new Date().toISOString()
        });

        // No backend stats without auth
        setStats({ total_referrals: 0, total_commissions: 0 });
      }
    } catch (error) {
      console.error('Error fetching referrals:', error);
      toast({
        title: "Error",
        description: "Failed to load referral data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const shareReferral = async (method: 'whatsapp' | 'native') => {
    if (!referralCode) return;
    
    // Fetch user profile for display name
    let referrerName = 'A friend';
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username, email')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (profile) {
        referrerName = profile.display_name || profile.username || extractUsernameFromEmail(profile.email) || 'A friend';
      }
    }
    
    // Get template from settings or use default
    const template = settings?.whatsapp_template || `🌟 *Join I-SMART Exchange!* 🌟

Hey! I'm earning crypto rewards with I-SMART Exchange. Join me! 💎

💰 *Why You'll Love It:*
✅ Trade IPG, BTC, ETH, USDT & more
✅ Earn BSK tokens on every trade
✅ Multi-level referral rewards
✅ Secure wallet with biometric protection
✅ Daily reward programs & lucky draws

🎁 *YOUR REFERRAL CODE:*
{CODE}

📱 *How to Join (3 Easy Steps):*
1️⃣ Download I-SMART Exchange app:
   [APK DOWNLOAD LINK - Coming Soon]

2️⃣ Sign up with your email

3️⃣ Enter referral code: {CODE}
   (Enter it during verification to get bonuses!)

💪 I've helped {TOTAL_REFERRALS} friends join!

Referred by: {REFERRER_NAME}

Start earning together! 🚀
#CryptoTrading #ISMART #ReferralRewards`;
    
    // Parse template with variables
    const message = template
      .replace(/{CODE}/g, referralCode.code)
      .replace(/{REFERRER_NAME}/g, referrerName)
      .replace(/{TOTAL_REFERRALS}/g, stats.total_referrals.toString());

    if (method === 'whatsapp') {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      await openUrl(whatsappUrl);
    } else if (method === 'native' && navigator.share) {
      try {
        await navigator.share({
          title: 'Join I-SMART Exchange',
          text: message
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, [user]);

  return {
    referralCode,
    settings,
    stats,
    loading,
    shareReferral,
    refetch: fetchReferrals
  };
};