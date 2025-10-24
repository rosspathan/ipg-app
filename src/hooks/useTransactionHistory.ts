import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UnifiedTransaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  category: 'INR_BANK' | 'INR_UPI' | 'CRYPTO' | 'CRYPTO_TO_INR';
  amount: number;
  currency: string;
  fee: number;
  net_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'canceled' | 'verifying';
  method: string;
  reference?: string;
  proof_url?: string;
  admin_notes?: string;
  user_notes?: string;
  created_at: string;
  decided_at?: string;
  asset_symbol?: string;
  asset_logo?: string;
}

export const useTransactionHistory = () => {
  return useQuery({
    queryKey: ['transaction-history'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const transactions: UnifiedTransaction[] = [];

      // Fetch INR deposits
      const { data: inrDeposits } = await supabase
        .from('fiat_deposits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (inrDeposits) {
        transactions.push(
          ...inrDeposits.map((d) => ({
            id: `inr-deposit-${d.id}`,
            type: 'deposit' as const,
            category: d.method === 'BANK' ? ('INR_BANK' as const) : ('INR_UPI' as const),
            amount: d.amount,
            currency: 'INR',
            fee: d.fee || 0,
            net_amount: d.amount - (d.fee || 0),
            status: d.status as any,
            method: d.method || 'BANK',
            reference: d.reference || undefined,
            proof_url: d.proof_url || undefined,
            admin_notes: d.admin_notes || undefined,
            created_at: d.created_at,
            decided_at: d.decided_at || undefined,
          }))
        );
      }

      // Fetch crypto deposits
      const { data: cryptoDeposits } = await supabase
        .from('deposits')
        .select('*, assets(symbol, logo_url)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (cryptoDeposits) {
        transactions.push(
          ...cryptoDeposits.map((d) => ({
            id: `crypto-deposit-${d.id}`,
            type: 'deposit' as const,
            category: 'CRYPTO' as const,
            amount: d.amount,
            currency: d.assets?.symbol || 'CRYPTO',
            fee: 0,
            net_amount: d.amount,
            status: d.status as any,
            method: d.assets?.symbol || 'CRYPTO',
            reference: d.tx_hash || undefined,
            created_at: d.created_at,
            asset_symbol: d.assets?.symbol,
            asset_logo: d.assets?.logo_url,
          }))
        );
      }

      // Fetch crypto-to-INR deposits
      const { data: cryptoToInrDeposits } = await supabase
        .from('crypto_to_inr_requests')
        .select('*, assets(symbol, name, logo_url)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (cryptoToInrDeposits) {
        transactions.push(
          ...cryptoToInrDeposits.map((d) => ({
            id: `crypto-to-inr-${d.id}`,
            type: 'deposit' as const,
            category: 'CRYPTO_TO_INR' as const,
            amount: d.crypto_amount,
            currency: d.assets?.symbol || 'CRYPTO',
            fee: d.total_fee || 0,
            net_amount: d.net_inr_credit || 0,
            status: d.status as any,
            method: `${d.assets?.symbol || 'CRYPTO'}→INR`,
            reference: d.tx_hash || undefined,
            proof_url: d.proof_url || undefined,
            admin_notes: d.admin_notes || undefined,
            user_notes: d.user_notes || undefined,
            created_at: d.created_at,
            decided_at: d.decided_at || undefined,
            asset_symbol: d.assets?.symbol,
            asset_logo: d.assets?.logo_url,
          }))
        );
      }

      // Fetch INR withdrawals
      const { data: inrWithdrawals } = await supabase
        .from('fiat_withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (inrWithdrawals) {
        transactions.push(
          ...inrWithdrawals.map((w) => ({
            id: `inr-withdrawal-${w.id}`,
            type: 'withdrawal' as const,
            category: 'INR_BANK' as const,
            amount: w.amount,
            currency: 'INR',
            fee: 0,
            net_amount: w.amount,
            status: w.status as any,
            method: 'BANK',
            reference: w.reference_id || undefined,
            admin_notes: w.admin_notes || undefined,
            created_at: w.created_at,
            decided_at: w.processed_at || undefined,
          }))
        );
      }

      // Fetch crypto withdrawals
      const { data: cryptoWithdrawals } = await supabase
        .from('withdrawals')
        .select('*, assets(symbol, logo_url)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (cryptoWithdrawals) {
        transactions.push(
          ...cryptoWithdrawals.map((w) => ({
            id: `crypto-withdrawal-${w.id}`,
            type: 'withdrawal' as const,
            category: 'CRYPTO' as const,
            amount: w.amount,
            currency: w.assets?.symbol || 'CRYPTO',
            fee: w.fee || 0,
            net_amount: w.amount - (w.fee || 0),
            status: w.status as any,
            method: w.assets?.symbol || 'CRYPTO',
            reference: w.tx_hash || undefined,
            admin_notes: w.rejected_reason || undefined,
            created_at: w.created_at,
            decided_at: w.approved_at || undefined,
            asset_symbol: w.assets?.symbol,
            asset_logo: w.assets?.logo_url,
          }))
        );
      }

      // Sort all transactions by created_at DESC
      return transactions.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
  });
};
