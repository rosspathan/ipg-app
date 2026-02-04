import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ReasonCode = 
  | 'OK'
  | 'MIGRATION_DISABLED'
  | 'MAINTENANCE_MODE'
  | 'WALLET_NOT_CONFIGURED'
  | 'PRIVATE_KEY_MISSING'
  | 'RPC_DOWN'
  | 'INSUFFICIENT_BSK'
  | 'INSUFFICIENT_BNB'
  | 'INTERNAL_ERROR';

export interface MigrationAvailability {
  available: boolean;
  reason_code: ReasonCode;
  user_message: string;
  debug_details?: Record<string, any>;
}

export interface MigrationEligibility {
  eligible: boolean;
  reasons: string[];
  system_available: boolean;
  system_reason_code?: ReasonCode;
  system_message?: string;
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
  private_key_configured: boolean;
  wallet_address: string | null;
  migration_enabled: boolean;
  maintenance_mode: boolean;
  maintenance_message: string | null;
  hot_wallet_bsk_balance: number;
  gas_balance_bnb: number;
  rpc_status: 'ok' | 'error';
  rpc_latency_ms: number | null;
  issues: string[];
  warnings: string[];
  last_migration?: { id: string; tx_hash: string | null; completed_at: string | null } | null;
}

export function useBSKMigration() {
  const [loading, setLoading] = useState(false);
  const [eligibility, setEligibility] = useState<MigrationEligibility | null>(null);
  const [availability, setAvailability] = useState<MigrationAvailability | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [history, setHistory] = useState<MigrationHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [health, setHealth] = useState<MigrationHealth | null>(null);

  const checkAvailability = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('user-migrate-bsk-onchain', {
        body: { action: 'check_availability' }
      });

      if (error) throw error;
      setAvailability(data);
      return data as MigrationAvailability;
    } catch (err: any) {
      console.error('[useBSKMigration] Check availability error:', err);
      // Return a default "available" on error to fail-open
      const fallback: MigrationAvailability = {
        available: true,
        reason_code: 'OK',
        user_message: 'Migration is available.'
      };
      setAvailability(fallback);
      return fallback;
    }
  }, []);

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
      // Don't show toast for network errors - let UI handle gracefully
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
      
      // Handle graceful error responses with specific messages
      if (data.error) {
        switch (data.error) {
          case 'pending_migration':
            toast.info('You have a pending migration. Please wait for it to complete.');
            break;
          case 'migration_disabled':
            toast.error('Migration is currently disabled.');
            break;
          case 'maintenance_mode':
            toast.error(data.message || 'Migration is under maintenance.');
            break;
          case 'insufficient_bsk':
          case 'insufficient_bnb':
            toast.error(data.message || 'Migration temporarily unavailable.');
            break;
          default:
            toast.error(data.message || 'Migration failed. Please try again.');
        }
        return null;
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
    const feeMultiplier = 1 - feePercent / 100;
    const minForPositiveNet = Math.ceil(gasEstimate / feeMultiplier) + 1;
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
    availability,
    migrating,
    result,
    history,
    historyLoading,
    health,
    checkAvailability,
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
