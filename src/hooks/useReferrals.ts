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
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch settings
      const { data: settingsData } = await supabase
        .from('mobile_linking_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (settingsData) {
        setSettings(settingsData as MobileLinkingSettings);
      }

      // Get or create referral code
      const { data: codeData, error: codeError } = await supabase
        .rpc('get_or_create_referral_code', { p_user_id: user.id });

      if (codeError) throw codeError;

      // Fetch the full code record
      const { data: codeRecord } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (codeRecord) {
        setReferralCode(codeRecord as ReferralCode);
      }

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