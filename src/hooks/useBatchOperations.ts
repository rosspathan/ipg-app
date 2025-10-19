import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BatchResult {
  successful: number;
  failed: number;
  errors: string[];
}

export function useBatchOperations() {
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const batchApproveKYC = async (submissionIds: string[], adminNotes?: string): Promise<BatchResult> => {
    setProcessing(true);
    const result: BatchResult = { successful: 0, failed: 0, errors: [] };

    try {
      const user = await supabase.auth.getUser();
      
      for (const id of submissionIds) {
        try {
          const { error } = await supabase
            .from('kyc_profiles_new')
            .update({
              status: 'approved',
              reviewed_at: new Date().toISOString(),
              reviewed_by: user.data.user?.id,
              admin_notes: adminNotes,
            })
            .eq('id', id);

          if (error) throw error;

          // Create audit log
          await supabase.from('kyc_audit_log').insert({
            submission_id: id,
            action: 'approved',
            performed_by: user.data.user?.id,
            notes: adminNotes || 'Batch approval',
          });

          result.successful++;
        } catch (err: any) {
          result.failed++;
          result.errors.push(`Failed to approve ${id}: ${err.message}`);
        }
      }

      toast({
        title: 'Batch Operation Complete',
        description: `Approved: ${result.successful}, Failed: ${result.failed}`,
        variant: result.failed > 0 ? 'default' : 'default',
      });
    } finally {
      setProcessing(false);
    }

    return result;
  };

  const batchRejectKYC = async (submissionIds: string[], reason: string): Promise<BatchResult> => {
    setProcessing(true);
    const result: BatchResult = { successful: 0, failed: 0, errors: [] };

    try {
      const user = await supabase.auth.getUser();
      
      for (const id of submissionIds) {
        try {
          const { error } = await supabase
            .from('kyc_profiles_new')
            .update({
              status: 'rejected',
              reviewed_at: new Date().toISOString(),
              reviewed_by: user.data.user?.id,
              admin_notes: reason,
            })
            .eq('id', id);

          if (error) throw error;

          // Create audit log
          await supabase.from('kyc_audit_log').insert({
            submission_id: id,
            action: 'rejected',
            performed_by: user.data.user?.id,
            notes: reason,
          });

          result.successful++;
        } catch (err: any) {
          result.failed++;
          result.errors.push(`Failed to reject ${id}: ${err.message}`);
        }
      }

      toast({
        title: 'Batch Operation Complete',
        description: `Rejected: ${result.successful}, Failed: ${result.failed}`,
        variant: result.failed > 0 ? 'default' : 'default',
      });
    } finally {
      setProcessing(false);
    }

    return result;
  };

  const batchApproveDeposits = async (depositIds: string[]): Promise<BatchResult> => {
    setProcessing(true);
    const result: BatchResult = { successful: 0, failed: 0, errors: [] };

    try {
      const user = await supabase.auth.getUser();
      
      for (const id of depositIds) {
        try {
          const { error } = await supabase
            .from('fiat_deposits')
            .update({
              status: 'approved',
              decided_at: new Date().toISOString(),
              decided_by: user.data.user?.id,
            })
            .eq('id', id);

          if (error) throw error;
          result.successful++;
        } catch (err: any) {
          result.failed++;
          result.errors.push(`Failed to approve deposit ${id}: ${err.message}`);
        }
      }

      toast({
        title: 'Batch Deposit Approval Complete',
        description: `Approved: ${result.successful}, Failed: ${result.failed}`,
      });
    } finally {
      setProcessing(false);
    }

    return result;
  };

  const batchApproveWithdrawals = async (withdrawalIds: string[]): Promise<BatchResult> => {
    setProcessing(true);
    const result: BatchResult = { successful: 0, failed: 0, errors: [] };

    try {
      const user = await supabase.auth.getUser();
      
      for (const id of withdrawalIds) {
        try {
          const { error } = await supabase
            .from('withdrawals')
            .update({
              status: 'approved',
              approved_at: new Date().toISOString(),
              approved_by: user.data.user?.id,
            })
            .eq('id', id);

          if (error) throw error;
          result.successful++;
        } catch (err: any) {
          result.failed++;
          result.errors.push(`Failed to approve withdrawal ${id}: ${err.message}`);
        }
      }

      toast({
        title: 'Batch Withdrawal Approval Complete',
        description: `Approved: ${result.successful}, Failed: ${result.failed}`,
      });
    } finally {
      setProcessing(false);
    }

    return result;
  };

  return {
    processing,
    batchApproveKYC,
    batchRejectKYC,
    batchApproveDeposits,
    batchApproveWithdrawals,
  };
}
