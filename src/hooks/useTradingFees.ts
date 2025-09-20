import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FeeSettings {
  id: string;
  default_maker_bps: number;
  default_taker_bps: number;
  fee_collect_asset: string;
  fee_discount_asset: string | null;
  fee_discount_tiers: any[] | null;
  min_fee: number;
  max_fee: number;
  admin_wallet_id: string | null;
}

interface FeeOverride {
  market_symbol: string;
  maker_bps: number | null;
  taker_bps: number | null;
  fee_collect_asset: string | null;
}

interface FeeCalculation {
  maker_fee_bps: number;
  taker_fee_bps: number;
  fee_asset: string;
  maker_fee_amount: number;
  taker_fee_amount: number;
}

export const useTradingFees = () => {
  const [feeSettings, setFeeSettings] = useState<FeeSettings | null>(null);
  const [feeOverrides, setFeeOverrides] = useState<FeeOverride[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeeSettings = async () => {
    try {
      // Get global fee settings
      const { data: globalSettings, error: globalError } = await supabase
        .from('trading_fee_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (globalError && globalError.code !== 'PGRST116') throw globalError;

      // Get fee overrides
      const { data: overrides, error: overridesError } = await supabase
        .from('trading_fee_overrides')
        .select('*');

      if (overridesError) throw overridesError;

      setFeeSettings(globalSettings);
      setFeeOverrides(overrides || []);
    } catch (error) {
      console.error('Error fetching fee settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFee = async (
    marketSymbol: string,
    tradeValue: number,
    isMaker: boolean,
    userBalance?: { [asset: string]: number }
  ): Promise<FeeCalculation> => {
    if (!feeSettings) {
      return {
        maker_fee_bps: 0,
        taker_fee_bps: 0,
        fee_asset: 'USDT',
        maker_fee_amount: 0,
        taker_fee_amount: 0
      };
    }

    // Check for market-specific overrides
    const override = feeOverrides.find(o => o.market_symbol === marketSymbol);
    
    let makerBps = override?.maker_bps || feeSettings.default_maker_bps;
    let takerBps = override?.taker_bps || feeSettings.default_taker_bps;
    
    // Apply discount tiers if user has discount asset
    if (feeSettings.fee_discount_asset && feeSettings.fee_discount_tiers && userBalance) {
      const discountBalance = userBalance[feeSettings.fee_discount_asset] || 0;
      
      // Find applicable discount tier
      const applicableTier = feeSettings.fee_discount_tiers
        .filter((tier: any) => discountBalance >= tier.hold_ge)
        .sort((a: any, b: any) => b.hold_ge - a.hold_ge)[0];
      
      if (applicableTier) {
        makerBps = applicableTier.maker_bps || makerBps;
        takerBps = applicableTier.taker_bps || takerBps;
      }
    }

    // Determine fee asset
    let feeAsset = override?.fee_collect_asset || feeSettings.fee_collect_asset;
    if (feeAsset === 'quote') {
      feeAsset = marketSymbol.split('/')[1] || 'USDT';
    }

    // Calculate fee amounts
    const makerFeeAmount = (tradeValue * makerBps) / 10000;
    const takerFeeAmount = (tradeValue * takerBps) / 10000;

    // Apply min/max fee limits if set
    let finalMakerFee = makerFeeAmount;
    let finalTakerFee = takerFeeAmount;

    if (feeSettings.min_fee > 0) {
      finalMakerFee = Math.max(finalMakerFee, feeSettings.min_fee);
      finalTakerFee = Math.max(finalTakerFee, feeSettings.min_fee);
    }

    if (feeSettings.max_fee > 0) {
      finalMakerFee = Math.min(finalMakerFee, feeSettings.max_fee);
      finalTakerFee = Math.min(finalTakerFee, feeSettings.max_fee);
    }

    return {
      maker_fee_bps: makerBps,
      taker_fee_bps: takerBps,
      fee_asset: feeAsset,
      maker_fee_amount: isMaker ? finalMakerFee : 0,
      taker_fee_amount: isMaker ? 0 : finalTakerFee
    };
  };

  const getFeePreview = async (
    marketSymbol: string,
    amount: number,
    price: number,
    side: 'buy' | 'sell'
  ): Promise<{ maker_fee: number; taker_fee: number; fee_asset: string }> => {
    const tradeValue = amount * price;
    const feeCalc = await calculateFee(marketSymbol, tradeValue, true); // Preview as maker
    const takerFeeCalc = await calculateFee(marketSymbol, tradeValue, false); // Preview as taker

    return {
      maker_fee: feeCalc.maker_fee_amount,
      taker_fee: takerFeeCalc.taker_fee_amount,
      fee_asset: feeCalc.fee_asset
    };
  };

  useEffect(() => {
    fetchFeeSettings();
  }, []);

  return {
    feeSettings,
    feeOverrides,
    loading,
    calculateFee,
    getFeePreview,
    refetch: fetchFeeSettings
  };
};