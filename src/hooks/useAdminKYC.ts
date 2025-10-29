import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type KYCProfile = Database['public']['Tables']['kyc_profiles_new']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export interface KYCSubmissionWithUser extends KYCProfile {
  profiles?: Partial<Profile> | { user_id: string; email: string };
}

export type KYCStatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'needs_info';

export function useAdminKYC() {
  const [submissions, setSubmissions] = useState<KYCSubmissionWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<KYCStatusFilter>('all');
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
      
      // First, fetch KYC submissions without JOIN to avoid RLS issues
      const { data, error } = await supabase
        .from('kyc_profiles_new')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      // Then, try to hydrate with user profiles (gracefully handle RLS restrictions)
      let merged: KYCSubmissionWithUser[] = data || [];
      try {
        const userIds = Array.from(new Set(merged.map(r => r.user_id).filter(Boolean)));
        if (userIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, email')
            .in('user_id', userIds);
          
          if (!profilesError && profiles) {
            const profileMap = new Map(profiles.map(p => [p.user_id, p]));
            merged = merged.map(row => ({ 
              ...row, 
              profiles: profileMap.get(row.user_id) 
            }));
          }
        }
      } catch (profileError) {
        console.warn('Profile hydration skipped due to permissions:', profileError);
        // Continue with KYC data only - admin can still review
      }
      
      setSubmissions(merged);
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
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          admin_notes: adminNotes,
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

      // Send email notification
      if (userId) {
        try {
          await supabase.functions.invoke('send-admin-action-notification', {
            body: {
              userId,
              actionType: 'kyc_approved',
              details: {
                status: 'Approved',
              },
            },
          });
        } catch (emailError) {
          console.error('Error sending notification email:', emailError);
        }
      }

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
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          admin_notes: reason,
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

      // Send email notification
      if (userId) {
        try {
          await supabase.functions.invoke('send-admin-action-notification', {
            body: {
              userId,
              actionType: 'kyc_rejected',
              details: {
                status: 'Rejected',
                reason: reason,
              },
            },
          });
        } catch (emailError) {
          console.error('Error sending notification email:', emailError);
        }
      }

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

  // Filter and search logic
  const filteredSubmissions = submissions.filter((submission) => {
    // Status filter
    if (statusFilter !== 'all' && submission.status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const email = submission.profiles?.email?.toLowerCase() || '';
      const dataJson = submission.data_json as any;
      const fullName = dataJson?.personal_details?.full_name?.toLowerCase() || '';
      return email.includes(query) || fullName.includes(query);
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
