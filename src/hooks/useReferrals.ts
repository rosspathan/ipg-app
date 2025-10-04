import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useToast } from '@/hooks/use-toast';

export interface ReferralLink {
  id: string;
  user_id: string;
  referral_code: string;
  sponsor_id?: string;
  locked_at?: string;
  source?: string;
  total_referrals: number;
  total_commissions: number;
  created_at: string;
  updated_at: string;
}

export interface ReferralConfig {
  app_host: string;
  ref_route_web: string;
  deep_link_scheme: string;
  android_package_id: string;
  android_sha256_fingerprint?: string;
  sponsor_locking_policy: 'first_touch' | 'manual_approval' | 'retro_allowed';
  self_referral_prevention: boolean;
  qr_code_size: number;
  whatsapp_support_url: string;
}

export const useReferrals = () => {
  const { user } = useAuthUser();
  const { toast } = useToast();
  const [referralLink, setReferralLink] = useState<ReferralLink | null>(null);
  const [config, setConfig] = useState<ReferralConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReferrals = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch config
      const { data: configData } = await supabase
        .from('referral_admin_config')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (configData) {
        setConfig(configData as ReferralConfig);
      }

      // Fetch user's referral link
      const { data: linkData } = await supabase
        .from('referral_links_new')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (linkData) {
        setReferralLink(linkData as ReferralLink);
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
    if (!referralLink || !config) return '';
    return `${config.app_host}${config.ref_route_web}/${referralLink.referral_code}`;
  };

  const getDeepLink = () => {
    if (!referralLink || !config) return '';
    return `${config.deep_link_scheme}://r/${referralLink.referral_code}`;
  };

  const shareReferral = async (method: 'whatsapp' | 'native') => {
    const url = getReferralUrl();
    const text = `Join me on i-Smart! Use my referral code: ${referralLink?.referral_code}\n${url}`;

    if (method === 'whatsapp') {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(whatsappUrl, '_blank');
    } else if (method === 'native' && navigator.share) {
      try {
        await navigator.share({
          title: 'Join i-Smart',
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
    referralLink,
    config,
    loading,
    getReferralUrl,
    getDeepLink,
    shareReferral,
    refetch: fetchReferrals
  };
};