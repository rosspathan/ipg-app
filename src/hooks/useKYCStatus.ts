import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type KYCPillarStatus =
  | 'not_started'
  | 'pending_review'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | string;

export interface KYCStatus {
  isApproved: boolean;
  documents: KYCPillarStatus;
  face: KYCPillarStatus;
  mobile: KYCPillarStatus;
  /** Friendly headline derived from the 3 pillars */
  headline: string;
}

const PENDING_LIKE = new Set(['submitted', 'pending_review', 'pending', 'in_review']);
const RESUBMIT_LIKE = new Set(['rejected', 'needs_resubmission']);

function deriveHeadline(d: string, f: string, m: string, isApproved: boolean): string {
  if (isApproved) return 'KYC Approved';
  const all = [d, f, m];
  if (all.every(s => s === 'not_started' || s === 'not_submitted' || !s)) return 'Complete your KYC to start trading';
  // Collapse rejected + needs_resubmission into a single user-facing state.
  if (all.some(s => RESUBMIT_LIKE.has(s))) return 'Action needed — resubmit your KYC';
  if (all.some(s => PENDING_LIKE.has(s))) return 'KYC pending admin review';
  return 'Finish all KYC steps to start trading';
}

/**
 * Single source of truth for the current user's KYC gate status, used to
 * disable trading actions and show a clear banner.
 */
export const useKYCStatus = () => {
  return useQuery<KYCStatus>({
    queryKey: ['kyc-status', 'current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          isApproved: false,
          documents: 'not_started',
          face: 'not_started',
          mobile: 'not_started',
          headline: 'Sign in required',
        };
      }

      // Authoritative server-side check (same RPC the edge function uses)
      const [{ data: approved }, { data: profile }] = await Promise.all([
        supabase.rpc('is_kyc_approved', { _user_id: user.id }),
        supabase
          .from('kyc_profiles_new')
          .select('documents_status, face_status, mobile_status')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      const documents = (profile?.documents_status as string) || 'not_started';
      const face = (profile?.face_status as string) || 'not_started';
      const mobile = (profile?.mobile_status as string) || 'not_started';
      const isApproved = !!approved;

      return {
        isApproved,
        documents,
        face,
        mobile,
        headline: deriveHeadline(documents, face, mobile, isApproved),
      };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
};
