import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MigrationEligibility {
  eligible: boolean;
  reasons: string[];
  wallet_linked: boolean;
  wallet_address: string | null;
  kyc_approved: boolean;
  account_active: boolean;
  withdrawable_balance: number;
  min_amount: number;
  has_pending_migration: boolean;
  pending_migration: any;
  recent_migrations: any[];
  gas_estimate_bsk: number;
}

export interface MigrationResult {
  success: boolean;
  migration_id: string;
  tx_hash: string;
  amount_requested: number;
  gas_deducted: number;
  net_amount: number;
  wallet_address: string;
  block_number: number;
}

export function useBSKMigration() {
  const [loading, setLoading] = useState(false);
  const [eligibility, setEligibility] = useState<MigrationEligibility | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);

  const checkEligibility = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('user-migrate-bsk-onchain', {
        body: { action: 'check_eligibility' }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setEligibility(data);
      return data as MigrationEligibility;
    } catch (err: any) {
      console.error('[useBSKMigration] Check eligibility error:', err);
      toast.error(err.message || 'Failed to check eligibility');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const initiateMigration = useCallback(async (amount: number) => {
    setMigrating(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('user-migrate-bsk-onchain', {
        body: { action: 'initiate_migration', amount }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setResult(data);
      toast.success(`Successfully migrated ${data.net_amount} BSK to on-chain!`);
      return data as MigrationResult;
    } catch (err: any) {
      console.error('[useBSKMigration] Migration error:', err);
      toast.error(err.message || 'Migration failed');
      return null;
    } finally {
      setMigrating(false);
    }
  }, []);

  const getMigrationStatus = useCallback(async (migrationId?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('user-migrate-bsk-onchain', {
        body: { action: 'get_status', migration_id: migrationId }
      });

      if (error) throw error;
      return data.migrations;
    } catch (err: any) {
      console.error('[useBSKMigration] Get status error:', err);
      return [];
    }
  }, []);

  return {
    loading,
    eligibility,
    migrating,
    result,
    checkEligibility,
    initiateMigration,
    getMigrationStatus,
    setResult
  };
}
