import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VerifiedKYCUser {
  id: string;
  user_id: string;
  full_name_computed: string | null;
  email_computed: string | null;
  phone_computed: string | null;
  display_name: string | null;
  username: string | null;
  profile_email: string | null;
  documents_status: string;
  face_status: string;
  mobile_status: string;
  final_status: string;
  final_approved_at: string | null;
  final_approved_by: string | null;
  data_json: Record<string, any>;
  submitted_at: string | null;
  reviewed_at: string | null;
}

export interface VerifiedKYCStats {
  total: number;
  today: number;
  this_week: number;
  this_month: number;
}

/**
 * Fetches users whose new KYC is fully approved AND who pass the
 * is_kyc_approved() trading gate. This is the source of truth for the
 * "Verified Users" admin tab.
 */
export function useVerifiedKYCUsers() {
  return useQuery<{ users: VerifiedKYCUser[]; stats: VerifiedKYCStats }>({
    queryKey: ['admin', 'kyc', 'verified-users'],
    queryFn: async () => {
      // Pull the rich admin summary view, filter to fully-approved.
      const { data, error } = await supabase
        .from('kyc_admin_summary')
        .select('*')
        .eq('final_status', 'approved')
        .eq('documents_status', 'approved')
        .eq('face_status', 'approved')
        .eq('mobile_status', 'approved')
        .order('final_approved_at', { ascending: false, nullsFirst: false })
        .limit(500);

      if (error) throw error;

      const users = (data ?? []) as unknown as VerifiedKYCUser[];

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000;
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

      let today = 0,
        week = 0,
        month = 0;
      for (const u of users) {
        if (!u.final_approved_at) continue;
        const t = new Date(u.final_approved_at).getTime();
        if (t >= todayStart) today += 1;
        if (t >= weekStart) week += 1;
        if (t >= monthStart) month += 1;
      }

      return {
        users,
        stats: {
          total: users.length,
          today,
          this_week: week,
          this_month: month,
        },
      };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
