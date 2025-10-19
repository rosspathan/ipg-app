import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type KYCProfile = Database['public']['Tables']['kyc_profiles_new']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export interface KYCSubmissionWithUser extends KYCProfile {
  profiles?: Profile;
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
      const { data, error } = await supabase
        .from('kyc_profiles_new')
        .select(`
          *,
          profiles!kyc_profiles_new_user_id_fkey (*)
        `)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data as any || []);
    } catch (error) {
      console.error('Error fetching KYC submissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load KYC submissions',
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
