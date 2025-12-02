import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type KYCProfile = Database['public']['Tables']['kyc_profiles_new']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export interface KYCSubmissionWithUser extends KYCProfile {
  profiles?: Partial<Profile> | { user_id: string; email: string };
}

export type KYCStatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'needs_info' | 'submitted' | 'draft';

export function useAdminKYC() {
  const [submissions, setSubmissions] = useState<KYCSubmissionWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<KYCStatusFilter>('submitted');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

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
      
      // Fetch KYC submissions directly
      const { data: kycData, error: kycError } = await supabase
        .from('kyc_profiles_new')
        .select('*')
        .order('submitted_at', { ascending: false, nullsFirst: false });

      if (kycError) throw kycError;
      
      // Fetch profiles separately for email/avatar lookup
      const userIds = kycData?.map(s => s.user_id).filter(Boolean) || [];
      
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, email, display_name, username')
          .in('user_id', userIds);
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        } else {
          profiles = profilesData || [];
        }
      }
      
      // Merge KYC data with profiles in JavaScript
      const merged = kycData?.map(kyc => ({
        ...kyc,
        profiles: profiles.find(p => p.user_id === kyc.user_id) || null
      })) || [];
      
      setSubmissions(merged as KYCSubmissionWithUser[]);
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

      const { error: updateError } = await supabase
        .from('kyc_profiles_new')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewer_id: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', submissionId);

      if (updateError) throw updateError;

      // Create audit log
      await supabase.from('kyc_audit_log').insert({
        submission_id: submissionId,
        action: 'approved',
        performed_by: (await supabase.auth.getUser()).data.user?.id,
        notes: adminNotes,
      });

      // CRITICAL: Credit 5 BSK reward directly to the KYC user
      // NO sponsor distribution for KYC approvals
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
          // Non-critical - KYC approval still succeeds
        }
      }

      // Email notifications disabled (domain not verified in Resend)

      toast({
        title: 'Success',
        description: 'KYC submission approved',
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

      const { error: updateError } = await supabase
        .from('kyc_profiles_new')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewer_id: (await supabase.auth.getUser()).data.user?.id,
          rejection_reason: reason,
        })
        .eq('id', submissionId);

      if (updateError) throw updateError;

      // Create audit log
      await supabase.from('kyc_audit_log').insert({
        submission_id: submissionId,
        action: 'rejected',
        performed_by: (await supabase.auth.getUser()).data.user?.id,
        notes: reason,
      });

      // Email notifications disabled (domain not verified in Resend)

      toast({
        title: 'Submission Rejected',
        description: 'The KYC submission has been rejected',
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

  // Filter and search logic using computed columns for better performance
  const filteredSubmissions = submissions.filter((submission) => {
    // Status filter
    if (statusFilter === 'pending') {
      // Pending includes both 'pending' and 'submitted' statuses
      if (submission.status !== 'pending' && submission.status !== 'submitted') {
        return false;
      }
    } else if (statusFilter !== 'all' && submission.status !== statusFilter) {
      return false;
    }

    // Search filter - use computed columns and flat structure
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const email = submission.profiles?.email?.toLowerCase() || '';
      const fullName = (submission.full_name_computed || '').toLowerCase();
      const phone = (submission.phone_computed || '').toLowerCase();
      return email.includes(query) || fullName.includes(query) || phone.includes(query);
    }

    return true;
  });

  return {
    submissions: filteredSubmissions,
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
