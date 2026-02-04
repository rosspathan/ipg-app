import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MigrationEligibility {
  eligible: boolean;
  reasons: string[];
  system_available: boolean;
  system_issues: string[];
  wallet_linked: boolean;
  wallet_address: string | null;
  kyc_approved: boolean;
  account_active: boolean;
  withdrawable_balance: number;
  min_amount: number;
  max_amount: number;
  has_pending_migration: boolean;
  pending_migration: any;
  recent_migrations: any[];
  gas_estimate_bsk: number;
  migration_fee_percent: number;
  required_confirmations: number;
}

export interface MigrationResult {
  success: boolean;
  migration_id: string;
  tx_hash: string;
  amount_requested: number;
  gas_deducted: number;
  migration_fee: number;
  net_amount: number;
  wallet_address: string;
  block_number: number;
  confirmations: number;
}

export interface MigrationHistoryItem {
  id: string;
  status: string;
  amount_requested: number;
  net_amount_migrated: number | null;
  gas_deduction_bsk: number | null;
  migration_fee_bsk: number | null;
  migration_fee_percent: number | null;
  wallet_address: string;
  tx_hash: string | null;
  block_number: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  refunded_at: string | null;
}

export interface MigrationHealth {
  healthy: boolean;
  wallet_configured: boolean;
  wallet_address: string | null;
  migration_enabled: boolean;
  hot_wallet_bsk_balance: number;
  gas_balance_bnb: number;
  rpc_status: 'ok' | 'error';
  issues: string[];
}

export function useBSKMigration() {
  const [loading, setLoading] = useState(false);
  const [eligibility, setEligibility] = useState<MigrationEligibility | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [history, setHistory] = useState<MigrationHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [health, setHealth] = useState<MigrationHealth | null>(null);

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
      // Don't show toast for system unavailable - let UI handle it gracefully
      if (!err.message?.includes('temporarily unavailable')) {
        toast.error(err.message || 'Failed to check eligibility');
      }
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
      
      // Handle graceful error responses
      if (data.error) {
        if (data.error === 'pending_migration') {
          toast.info('You have a pending migration. Please wait for it to complete.');
          return null;
        }
        if (data.error === 'system_unavailable') {
          toast.error('Migration temporarily unavailable. Please try later.');
          return null;
        }
        throw new Error(data.error);
      }

      setResult(data);
      toast.success(`Successfully migrated ${data.net_amount} BSK to on-chain!`);
      // Refresh history after migration
      fetchHistory();
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

  const getHealth = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('user-migrate-bsk-onchain', {
        body: { action: 'get_health' }
      });

      if (error) throw error;
      setHealth(data);
      return data as MigrationHealth;
    } catch (err: any) {
      console.error('[useBSKMigration] Get health error:', err);
      return null;
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('bsk_onchain_migrations')
        .select('id, status, amount_requested, net_amount_migrated, gas_deduction_bsk, migration_fee_bsk, migration_fee_percent, wallet_address, tx_hash, block_number, error_message, created_at, completed_at, refunded_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data || []);
    } catch (err: any) {
      console.error('[useBSKMigration] Fetch history error:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Calculate max valid amount that results in net_receive > 0
  const calculateMaxValidAmount = useCallback((
    availableBalance: number,
    feePercent: number,
    gasEstimate: number
  ): number => {
    // net = amount - (amount * feePercent / 100) - gas
    // net > 0 => amount * (1 - feePercent/100) > gas
    // amount > gas / (1 - feePercent/100)
    const feeMultiplier = 1 - feePercent / 100;
    const minForPositiveNet = Math.ceil(gasEstimate / feeMultiplier) + 1;
    
    // Max is the smaller of available balance and any configured max
    return Math.min(availableBalance, availableBalance);
  }, []);

  // Calculate net amount using same formula as server
  const calculateNetAmount = useCallback((
    amount: number,
    feePercent: number,
    gasEstimate: number
  ): { fee: number; gas: number; net: number } => {
    const fee = Math.ceil(amount * feePercent / 100);
    const gas = gasEstimate;
    const net = Math.max(0, amount - fee - gas);
    return { fee, gas, net };
  }, []);

  return {
    loading,
    eligibility,
    migrating,
    result,
    history,
    historyLoading,
    health,
    checkEligibility,
    initiateMigration,
    getMigrationStatus,
    getHealth,
    fetchHistory,
    setResult,
    calculateMaxValidAmount,
    calculateNetAmount
  };
}
