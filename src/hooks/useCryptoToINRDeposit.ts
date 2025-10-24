import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CryptoToINRRequest {
  assetSymbol: string;
  assetId: string;
  amount: number;
  txHash: string;
  network: string;
  proofUrl?: string;
  userNotes?: string;
}

export interface FeeCalculation {
  cryptoAmount: number;
  cryptoUsdRate: number;
  inrUsdRate: number;
  inrSubtotal: number;
  feePercent: number;
  feeFixed: number;
  totalFee: number;
  netInrCredit: number;
}

export const useCryptoToINRDeposit = () => {
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const calculateFees = async (
    assetSymbol: string,
    assetId: string,
    amount: number,
    network: string
  ): Promise<FeeCalculation | null> => {
    setCalculating(true);
    try {
      // Fetch live crypto rates
      const { data: ratesData, error: ratesError } = await supabase.functions.invoke(
        'get-crypto-rates',
        { body: { symbols: [assetSymbol] } }
      );

      if (ratesError) throw ratesError;

      const cryptoUsdRate = ratesData.rates[assetSymbol]?.usd || 0;
      const inrUsdRate = ratesData.inr_usd_rate;
      const inrSubtotal = amount * cryptoUsdRate * inrUsdRate;

      // Check minimum deposit requirement (₹100)
      if (inrSubtotal < 100) {
        toast.error('Deposit amount too low', {
          description: 'Minimum deposit equivalent is ₹100'
        });
        return null;
      }

      // Get fee config for this asset
      const { data: feeConfig, error: feeError } = await supabase
        .from('crypto_deposit_fee_configs')
        .select('*')
        .eq('asset_id', assetId)
        .eq('network', network)
        .eq('active', true)
        .single();

      if (feeError && feeError.code !== 'PGRST116') throw feeError;

      const feePercent = feeConfig?.fee_percent || 0;
      const feeFixed = feeConfig?.fee_fixed || 0;
      const totalFee = (inrSubtotal * feePercent / 100) + feeFixed;
      const netInrCredit = inrSubtotal - totalFee;

      return {
        cryptoAmount: amount,
        cryptoUsdRate,
        inrUsdRate,
        inrSubtotal,
        feePercent,
        feeFixed,
        totalFee,
        netInrCredit,
      };
    } catch (error: any) {
      console.error('Error calculating fees:', error);
      toast.error('Failed to calculate fees');
      return null;
    } finally {
      setCalculating(false);
    }
  };

  const submitRequest = async (request: CryptoToINRRequest): Promise<any> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate fees with live rates
      const calculation = await calculateFees(
        request.assetSymbol,
        request.assetId,
        request.amount,
        request.network
      );

      if (!calculation) {
        throw new Error('Failed to calculate fees');
      }

      // Check if deposit exists in blockchain tracking
      const { data: existingDeposit } = await supabase
        .from('deposits')
        .select('id')
        .eq('tx_hash', request.txHash)
        .maybeSingle();

      // Create request
      const { data, error } = await supabase
        .from('crypto_to_inr_requests')
        .insert({
          user_id: user.id,
          crypto_asset_id: request.assetId,
          crypto_amount: request.amount,
          tx_hash: request.txHash,
          network: request.network,
          deposit_id: existingDeposit?.id,
          crypto_usd_rate: calculation.cryptoUsdRate,
          inr_usd_rate: calculation.inrUsdRate,
          inr_equivalent: calculation.inrSubtotal,
          deposit_fee_percent: calculation.feePercent,
          deposit_fee_fixed: calculation.feeFixed,
          total_fee: calculation.totalFee,
          net_inr_credit: calculation.netInrCredit,
          proof_url: request.proofUrl,
          user_notes: request.userNotes,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger admin notification (fire and forget)
      supabase.functions.invoke('notify-admin', {
        body: {
          type: 'crypto_to_inr_deposit',
          requestId: data.id
        }
      }).catch(err => console.error('Failed to notify admin:', err));

      toast.success('Request submitted successfully', {
        description: 'Your deposit request is pending admin approval'
      });

      return data;
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request', {
        description: error.message
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    submitRequest,
    calculateFees,
    loading,
    calculating,
  };
};
