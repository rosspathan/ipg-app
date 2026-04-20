import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  computeOverallKYCStatus,
  computeOverallStats,
  type OverallKYCStats,
} from '@/lib/kyc/overallStatus';

export interface KYCSubmissionWithUser {
  id: string;
  user_id: string;
  level: string;
  status: string;
  data_json: Record<string, any>;
  full_name_computed: string | null;
  email_computed: string | null;
  phone_computed: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewer_id: string | null;
  rejection_reason: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  profile_email: string | null;
  display_name: string | null;
  username: string | null;
  // 3-pillar truth (now exposed by kyc_admin_summary)
  documents_status?: string;
  face_status?: string;
  mobile_status?: string;
  final_status?: string;
  final_approved_at?: string | null;
  display_status?: string; // canonical display status from DB
}

export type KYCStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export function useAdminKYC() {
  const [submissions, setSubmissions] = useState<KYCSubmissionWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<KYCStatusFilter>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      
      // Use the admin summary view
      const { data: kycData, error: kycError } = await supabase
        .from('kyc_admin_summary')
        .select('*')
        .order('submitted_at', { ascending: false, nullsFirst: false });

      if (kycError) {
        console.error('[AdminKYC] Fetch error:', kycError);
        throw kycError;
      }
      
      const allSubmissions = (kycData || []) as KYCSubmissionWithUser[];
      setSubmissions(allSubmissions);

      // Use canonical display_status (3-pillar truth) instead of legacy status
      const isApproved = (s: KYCSubmissionWithUser) => (s.display_status ?? s.status) === 'approved';
      const isRejected = (s: KYCSubmissionWithUser) => (s.display_status ?? s.status) === 'rejected';
      const isPending = (s: KYCSubmissionWithUser) => {
        const ds = s.display_status ?? s.status;
        return ds === 'under_review' || ds === 'pending' || ds === 'submitted' || ds === 'in_review' || ds === 'needs_action';
      };

      const pending = allSubmissions.filter(isPending).length;
      const approved = allSubmissions.filter(isApproved).length;
      const rejected = allSubmissions.filter(isRejected).length;
      
      setStats({
        total: allSubmissions.length,
        pending,
        approved,
        rejected
      });
    } catch (error) {
      console.error('[AdminKYC] Error:', error);
      toast({
        title: 'Error',
        description: `Failed to load KYC submissions`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
    
    // Real-time subscription
    const channel = supabase
      .channel('kyc-admin-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kyc_profiles_new'
        },
        (payload) => {
          console.log('[AdminKYC] Realtime update:', payload.eventType);
          if (payload.eventType === 'INSERT') {
            toast({
              title: '🆕 New KYC Submission',
              description: 'A new KYC submission has been received.',
            });
          }
          fetchSubmissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const PENDING_STATUSES = ['pending', 'submitted', 'in_review', 'under_review', 'needs_action'];

  const approveSubmission = async (submissionId: string, adminNotes?: string) => {
    try {
      const submission = submissions.find(s => s.id === submissionId);
      const userId = submission?.user_id;
      const currentUser = await supabase.auth.getUser();

      // Guard: only approve if still pending (defense-in-depth against double-clicks / stale UI)
      const effective = (submission?.display_status ?? submission?.status) as string | undefined;
      if (effective && !PENDING_STATUSES.includes(effective)) {
        toast({
          title: 'Already finalized',
          description: `This submission is already ${effective}. No further action required.`,
          variant: 'destructive',
        });
        fetchSubmissions();
        return;
      }

      const { data: updated, error: updateError } = await supabase
        .from('kyc_profiles_new')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewer_id: currentUser.data.user?.id,
          review_notes: adminNotes,
        })
        .eq('id', submissionId)
        .in('status', PENDING_STATUSES)
        .select('id');

      if (updateError) throw updateError;

      if (!updated || updated.length === 0) {
        toast({
          title: 'Already finalized',
          description: 'This KYC was already approved or rejected by another admin. Refreshing…',
          variant: 'destructive',
        });
        fetchSubmissions();
        return;
      }

      // Audit log
      await supabase.from('kyc_audit_log').insert({
        submission_id: submissionId,
        action: 'approved',
        performed_by: currentUser.data.user?.id,
        notes: adminNotes,
      });

      // Update user profile
      if (userId) {
        await supabase
          .from('profiles')
          .update({ kyc_status: 'approved', is_kyc_approved: true })
          .eq('user_id', userId);
      }

      // Credit BSK reward
      if (userId) {
        try {
          const { error: rewardError } = await supabase.functions.invoke(
            'process-kyc-user-reward',
            { body: { user_id: userId, reward_bsk: 5 } }
          );
          if (rewardError) {
            console.error('KYC reward failed:', rewardError);
          }
        } catch (rewardError) {
          console.error('Error crediting KYC reward:', rewardError);
        }
      }

      toast({
        title: '✅ Approved',
        description: 'KYC submission approved successfully',
      });

      fetchSubmissions();
    } catch (error) {
      console.error('Error approving:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve submission',
        variant: 'destructive',
      });
    }
  };

  const rejectSubmission = async (submissionId: string, reason: string) => {
    try {
      const submission = submissions.find(s => s.id === submissionId);
      const userId = submission?.user_id;
      const currentUser = await supabase.auth.getUser();

      const effective = (submission?.display_status ?? submission?.status) as string | undefined;
      if (effective && !PENDING_STATUSES.includes(effective)) {
        toast({
          title: 'Already finalized',
          description: `This submission is already ${effective}. No further action required.`,
          variant: 'destructive',
        });
        fetchSubmissions();
        return;
      }

      const { data: updated, error: updateError } = await supabase
        .from('kyc_profiles_new')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewer_id: currentUser.data.user?.id,
          rejection_reason: reason,
        })
        .eq('id', submissionId)
        .in('status', PENDING_STATUSES)
        .select('id');

      if (updateError) throw updateError;

      if (!updated || updated.length === 0) {
        toast({
          title: 'Already finalized',
          description: 'This KYC was already approved or rejected by another admin. Refreshing…',
          variant: 'destructive',
        });
        fetchSubmissions();
        return;
      }

      // Audit log
      await supabase.from('kyc_audit_log').insert({
        submission_id: submissionId,
        action: 'rejected',
        performed_by: currentUser.data.user?.id,
        notes: reason,
      });

      // Update user profile
      if (userId) {
        await supabase
          .from('profiles')
          .update({ kyc_status: 'rejected' })
          .eq('user_id', userId);
      }

      toast({
        title: '❌ Rejected',
        description: 'Submission rejected. User can resubmit with corrections.',
      });

      fetchSubmissions();
    } catch (error) {
      console.error('Error rejecting:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject submission',
        variant: 'destructive',
      });
    }
  };

  // Filter and search — uses canonical display_status (3-pillar truth)
  const filteredSubmissions = submissions.filter((submission) => {
    const effectiveStatus = submission.display_status ?? submission.status;
    if (statusFilter === 'pending') {
      if (!['pending', 'submitted', 'in_review', 'under_review', 'needs_action'].includes(effectiveStatus)) return false;
    } else if (statusFilter !== 'all' && effectiveStatus !== statusFilter) {
      return false;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const searchFields = [
        submission.profile_email, submission.email_computed,
        submission.full_name_computed, submission.display_name,
        submission.phone_computed, submission.username,
        submission.data_json?.full_name, submission.data_json?.phone,
      ].filter(Boolean).map(s => s!.toLowerCase());
      
      return searchFields.some(f => f.includes(query));
    }

    return true;
  });

  return {
    submissions: filteredSubmissions,
    allSubmissions: submissions,
    stats,
    loading,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    approveSubmission,
    rejectSubmission,
    refetch: fetchSubmissions,
  };
}
