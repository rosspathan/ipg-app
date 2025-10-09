import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useToast } from '@/hooks/use-toast';

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
        // Use sponsor's user_id directly as referral code
        setReferralCode({
          id: user.id,
          user_id: user.id,
          code: user.id,
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

  const getReferralUrl = () => {
    if (!referralCode || !settings) return '';
    return `${settings.host}${settings.ref_base_path}/${referralCode.code}`;
  };

  const getDeepLink = () => {
    if (!referralCode || !settings) return '';
    return `${settings.custom_scheme}://r/${referralCode.code}`;
  };

  const shareReferral = async (method: 'whatsapp' | 'native') => {
    const url = getReferralUrl();
    const template = settings?.whatsapp_template || 'Join me on IPG I-SMART! Use my link: {{link}} 🚀';
    const text = template.replace('{{link}}', url);

    if (method === 'whatsapp') {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(whatsappUrl, '_blank');
    } else if (method === 'native' && navigator.share) {
      try {
        await navigator.share({
          title: 'Join IPG I-SMART',
          text,
          url
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
    getReferralUrl,
    getDeepLink,
    shareReferral,
    refetch: fetchReferrals
  };
};