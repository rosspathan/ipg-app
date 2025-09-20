import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ArrowDownUp, Coins, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  bskBalance: number;
  onConversionComplete?: () => void;
}

export const ConversionModal: React.FC<ConversionModalProps> = ({
  isOpen,
  onClose,
  bskBalance,
  onConversionComplete
}) => {
  const [bskAmount, setBskAmount] = useState('');
  const [usdtAmount, setUsdtAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState(0.1); // Default rate
  const [feePercent, setFeePercent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadExchangeSettings();
    }
  }, [isOpen]);

  const loadExchangeSettings = async () => {
    setLoading(true);
    try {
      // Get BSK price from bonus_prices table
      const { data: priceData } = await supabase
        .from('bonus_prices')
        .select('price')
        .eq('asset_id', (
          await supabase
            .from('bonus_assets')
            .select('id')
            .eq('symbol', 'BSK')
            .single()
        ).data?.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      if (priceData) {
        setExchangeRate(Number(priceData.price));
      }

      // Get conversion fee from system settings
      const { data: feeData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'bsk_conversion_fee_percent')
        .single();

      if (feeData) {
        setFeePercent(Number(feeData.value));
      }
    } catch (error) {
      console.error('Error loading exchange settings:', error);
    }
    setLoading(false);
  };

  const handleBskAmountChange = (value: string) => {
    setBskAmount(value);
    const bsk = parseFloat(value) || 0;
    const gross = bsk * exchangeRate;
    const fee = gross * (feePercent / 100);
    const net = gross - fee;
    setUsdtAmount(net.toFixed(6));
  };

  const handleUsdtAmountChange = (value: string) => {
    setUsdtAmount(value);
    const usdt = parseFloat(value) || 0;
    const gross = usdt / (1 - feePercent / 100);
    const bsk = gross / exchangeRate;
    setBskAmount(bsk.toFixed(2));
  };

  const handleMaxClick = () => {
    handleBskAmountChange(bskBalance.toString());
  };

  const handleConvert = async () => {
    const bsk = parseFloat(bskAmount);
    const usdt = parseFloat(usdtAmount);

    if (!bsk || !usdt || bsk > bskBalance) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount within your balance",
        variant: "destructive"
      });
      return;
    }

    setConverting(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) throw new Error('User not authenticated');

      // Get asset IDs
      const { data: bskAsset } = await supabase
        .from('bonus_assets')
        .select('id')
        .eq('symbol', 'BSK')
        .single();

      const { data: usdtAsset } = await supabase
        .from('assets')
        .select('id')
        .eq('symbol', 'USDT')
        .single();

      if (!bskAsset || !usdtAsset) {
        throw new Error('Asset configuration error');
      }

      // Create conversion record
      const { data: conversion, error: conversionError } = await supabase
        .from('conversions')
        .insert({
          user_id: user.user.id,
          from_asset: 'BSK',
          to_asset: 'USDT',
          rate: exchangeRate,
          amount_from: bsk,
          amount_to: usdt,
          fee: (bsk * exchangeRate) - usdt,
          fee_percent: feePercent
        })
        .select()
        .single();

      if (conversionError) throw conversionError;

      // Update BSK bonus balance (debit)
      const { error: bskError } = await supabase
        .from('wallet_bonus_balances')
        .update({
          balance: bskBalance - bsk
        })
        .eq('user_id', user.user.id)
        .eq('asset_id', bskAsset.id);

      if (bskError) throw bskError;

      // Create ledger entries
      await Promise.all([
        // BSK debit
        supabase.from('bonus_ledger').insert({
          user_id: user.user.id,
          type: 'convert',
          asset: 'BSK',
          amount_bsk: -bsk,
          usd_value: bsk * exchangeRate,
          meta_json: {
            conversion_id: conversion.id,
            to_asset: 'USDT',
            rate: exchangeRate
          }
        }),
        // USDT credit (would need wallet_balances table for main balance)
        // For now, just create a ledger entry
        supabase.from('bonus_ledger').insert({
          user_id: user.user.id,
          type: 'convert_credit',
          asset: 'USDT',
          amount_bsk: 0,
          usd_value: usdt,
          meta_json: {
            conversion_id: conversion.id,
            from_asset: 'BSK',
            amount_usdt: usdt
          }
        })
      ]);

      toast({
        title: "Conversion Successful!",
        description: `Converted ${bsk} BSK to ${usdt} USDT`,
      });

      onConversionComplete?.();
      onClose();
    } catch (error) {
      console.error('Conversion error:', error);
      toast({
        title: "Conversion Failed",
        description: "Please try again later",
        variant: "destructive"
      });
    }
    
    setConverting(false);
  };

  const bsk = parseFloat(bskAmount) || 0;
  const gross = bsk * exchangeRate;
  const fee = gross * (feePercent / 100);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownUp className="w-5 h-5 text-primary" />
            Convert BSK to USDT
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Exchange Rate Info */}
          <Card className="p-3 bg-muted/50">
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Exchange Rate:</span>
                <span className="font-medium">1 BSK = {exchangeRate} USDT</span>
              </div>
              {feePercent > 0 && (
                <div className="flex justify-between">
                  <span>Conversion Fee:</span>
                  <span className="font-medium">{feePercent}%</span>
                </div>
              )}
            </div>
          </Card>

          {/* From Amount */}
          <div className="space-y-2">
            <Label>From (BSK)</Label>
            <div className="relative">
              <Coins className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                value={bskAmount}
                onChange={(e) => handleBskAmountChange(e.target.value)}
                placeholder="0.00"
                type="number"
                step="0.01"
                className="pl-10 pr-16"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 text-xs"
                onClick={handleMaxClick}
              >
                MAX
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Available: {bskBalance.toFixed(2)} BSK
            </p>
          </div>

          {/* Conversion Details */}
          {bsk > 0 && (
            <Card className="p-3 bg-primary/5 border-primary/20">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Gross Amount:</span>
                  <span>{gross.toFixed(6)} USDT</span>
                </div>
                {fee > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Fee ({feePercent}%):</span>
                    <span>-{fee.toFixed(6)} USDT</span>
                  </div>
                )}
                <div className="flex justify-between font-medium pt-1 border-t border-primary/20">
                  <span>You'll receive:</span>
                  <span>{usdtAmount} USDT</span>
                </div>
              </div>
            </Card>
          )}

          {/* To Amount */}
          <div className="space-y-2">
            <Label>To (USDT)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                value={usdtAmount}
                onChange={(e) => handleUsdtAmountChange(e.target.value)}
                placeholder="0.000000"
                type="number"
                step="0.000001"
                className="pl-10"
              />
            </div>
          </div>

          {/* Convert Button */}
          <Button
            onClick={handleConvert}
            disabled={!bsk || bsk > bskBalance || converting || loading}
            className="w-full"
            size="lg"
          >
            {converting ? 'Converting...' : 'Convert to USDT'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};