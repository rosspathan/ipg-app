import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';

interface ReferralStats {
  totalReferrals: number;
  totalEarned: number;
  activeReferrals: number;
}

const generateReferralCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const useReferralCode = () => {
  const { user } = useAuthUser();
  const [referralCode, setReferralCode] = useState<string>('');
  const [referralLink, setReferralLink] = useState<string>('');
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    totalEarned: 0,
    activeReferrals: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Get referral code
        const { data: profile } = await supabase
          .from('profiles')
          .select('referral_code')
          .eq('user_id', user.id)
          .single();

        let code = profile?.referral_code || generateReferralCode();
        if (!profile?.referral_code) {
          await supabase.from('profiles').update({ referral_code: code }).eq('user_id', user.id);
        }

        setReferralCode(code);
        // Use UUID-based link for unambiguous sponsor resolution
        setReferralLink(`${window.location.origin}/?ref=${user.id}`);

        // Get stats
        const { data: refData } = await supabase
          .from('referral_links_new')
          .select('total_referrals, total_commissions')
          .eq('user_id', user.id)
          .maybeSingle();

        setStats({
          totalReferrals: refData?.total_referrals || 0,
          totalEarned: Number(refData?.total_commissions || 0),
          activeReferrals: refData?.total_referrals || 0
        });
      } catch (error) {
        console.error('Referral error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  return { referralCode, referralLink, stats, loading };
};
