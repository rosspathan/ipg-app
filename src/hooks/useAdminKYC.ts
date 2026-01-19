import { useState, useEffect } from 'react';
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

  // Stats for the dashboard
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  useEffect(() => {
    fetchSubmissions();
    
    // Real-time subscription for new submissions
    const channel = supabase
      .channel('kyc-admin-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kyc_profiles_new'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            toast({
              title: 'New KYC Submission',
              description: 'A new KYC submission has been received.',
            });
            fetchSubmissions();
          } else if (payload.eventType === 'UPDATE') {
            fetchSubmissions();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      
      // Use the new deduplicated view - one row per user
      const { data: kycData, error: kycError } = await supabase
        .from('kyc_admin_summary')
        .select('*')
        .order('submitted_at', { ascending: false, nullsFirst: false });

      if (kycError) throw kycError;
      
      const allSubmissions = (kycData || []) as KYCSubmissionWithUser[];
      setSubmissions(allSubmissions);

      // Calculate accurate stats
      const pending = allSubmissions.filter(s => s.status === 'submitted' || s.status === 'pending' || s.status === 'in_review').length;
      const approved = allSubmissions.filter(s => s.status === 'approved').length;
      const rejected = allSubmissions.filter(s => s.status === 'rejected').length;
      
      setStats({
        total: allSubmissions.length,
        pending,
        approved,
        rejected
      });
    } catch (error) {
      console.error('Error fetching KYC submissions:', error);
      toast({
        title: 'Error',
        description: `Failed to load KYC submissions${(error as any)?.message ? `: ${(error as any).message}` : ''}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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

      // Create audit log
      await supabase.from('kyc_audit_log').insert({
        submission_id: submissionId,
        action: 'approved',
        performed_by: currentUser.data.user?.id,
        notes: adminNotes,
      });

      // Update user profile kyc_status
      if (userId) {
        await supabase
          .from('profiles')
          .update({ kyc_status: 'approved', is_kyc_approved: true })
          .eq('user_id', userId);
      }

      // Credit BSK reward
      if (userId) {
        try {
          console.log('🎁 Crediting KYC reward to user:', userId);
          const { data: rewardResult, error: rewardError } = await supabase.functions.invoke(
            'process-kyc-user-reward',
            {
              body: {
                user_id: userId,
                reward_bsk: 5
              }
            }
          );

          if (rewardError) {
            console.error('⚠️ KYC reward crediting failed:', rewardError);
            toast({
              title: "Warning",
              description: "KYC approved but reward crediting failed. Check logs.",
              variant: "destructive",
            });
          } else {
            console.log('✅ KYC reward credited:', rewardResult);
          }
        } catch (rewardError) {
          console.error('⚠️ Error crediting KYC reward:', rewardError);
        }
      }

      toast({
        title: 'Success',
        description: 'KYC submission approved successfully',
      });

      fetchSubmissions();
    } catch (error) {
      console.error('Error approving submission:', error);
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

      // Create audit log
      await supabase.from('kyc_audit_log').insert({
        submission_id: submissionId,
        action: 'rejected',
        performed_by: currentUser.data.user?.id,
        notes: reason,
      });

      // Update user profile kyc_status
      if (userId) {
        await supabase
          .from('profiles')
          .update({ kyc_status: 'rejected' })
          .eq('user_id', userId);
      }

      toast({
        title: 'Submission Rejected',
        description: 'The KYC submission has been rejected. User can resubmit with corrected documents.',
      });

      fetchSubmissions();
    } catch (error) {
      console.error('Error rejecting submission:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject submission',
        variant: 'destructive',
      });
    }
  };

  // Filter and search logic
  const filteredSubmissions = submissions.filter((submission) => {
    // Status filter
    if (statusFilter === 'pending') {
      if (!['pending', 'submitted', 'in_review'].includes(submission.status)) {
        return false;
      }
    } else if (statusFilter !== 'all' && submission.status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const email = (submission.profile_email || submission.email_computed || '').toLowerCase();
      const fullName = (submission.full_name_computed || submission.display_name || '').toLowerCase();
      const phone = (submission.phone_computed || '').toLowerCase();
      const username = (submission.username || '').toLowerCase();
      return email.includes(query) || fullName.includes(query) || phone.includes(query) || username.includes(query);
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
