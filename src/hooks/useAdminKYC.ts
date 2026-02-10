import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

      const pending = allSubmissions.filter(s => ['pending', 'submitted', 'in_review'].includes(s.status)).length;
      const approved = allSubmissions.filter(s => s.status === 'approved').length;
      const rejected = allSubmissions.filter(s => s.status === 'rejected').length;
      
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

  const approveSubmission = async (submissionId: string, adminNotes?: string) => {
    try {
      const submission = submissions.find(s => s.id === submissionId);
      const userId = submission?.user_id;
      const currentUser = await supabase.auth.getUser();
      
      const { error: updateError } = await supabase
        .from('kyc_profiles_new')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewer_id: currentUser.data.user?.id,
          review_notes: adminNotes,
        })
        .eq('id', submissionId);

      if (updateError) throw updateError;

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

      const { error: updateError } = await supabase
        .from('kyc_profiles_new')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewer_id: currentUser.data.user?.id,
          rejection_reason: reason,
        })
        .eq('id', submissionId);

      if (updateError) throw updateError;

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

  // Filter and search
  const filteredSubmissions = submissions.filter((submission) => {
    if (statusFilter === 'pending') {
      if (!['pending', 'submitted', 'in_review'].includes(submission.status)) return false;
    } else if (statusFilter !== 'all' && submission.status !== statusFilter) {
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
