import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCatalog } from './useCatalog';

interface FXRate {
  id: string;
  base: string;
  quote: string;
  rate: number;
  updated_at: string;
}

interface UserSettings {
  id: string;
  user_id: string;
  display_currency: string;
  updated_at: string;
}

export const useFX = () => {
  const [fxRates, setFxRates] = useState<FXRate[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);

  const { pairsList } = useCatalog();

  // Load FX rates and user settings
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load FX rates
        const { data: rates } = await supabase
          .from('fx_rates')
          .select('*');
        
        if (rates) {
          setFxRates(rates);
        }

        // Load user settings if authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: settings } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (settings) {
            setUserSettings(settings);
            setDisplayCurrency(settings.display_currency);
          } else {
            // Create default settings
            const { data: newSettings } = await supabase
              .from('user_settings')
              .insert({ user_id: user.id, display_currency: 'USD' })
              .select()
              .single();
            
            if (newSettings) {
              setUserSettings(newSettings);
              setDisplayCurrency(newSettings.display_currency);
            }
          }
        }
      } catch (error) {
        console.error('Error loading FX data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Convert amount from one currency to another
  const convert = useCallback((amount: number, fromSymbol: string, toSymbol: string): number => {
    if (fromSymbol === toSymbol) return amount;
    if (amount === 0) return 0;

    // Handle fiat to fiat conversion
    if (fromSymbol === 'USD' || fromSymbol === 'INR') {
      if (toSymbol === 'USD' || toSymbol === 'INR') {
        const rate = fxRates.find(r => r.base === fromSymbol && r.quote === toSymbol);
        return rate ? amount * rate.rate : amount;
      }
    }

    // For MVP: Use basic static rates for crypto conversions
    // In production, this would use real-time market data
    const staticRates: Record<string, number> = {
      'BTC': 45000,    // BTC to USD
      'ETH': 2500,     // ETH to USD
      'BNB': 350,      // BNB to USD
      'USDT': 1,       // USDT to USD
      'IPG': 0.05,     // IPG to USD
    };

    // Convert to USD first
    let usdAmount = amount;
    if (fromSymbol !== 'USD' && staticRates[fromSymbol]) {
      usdAmount = amount * staticRates[fromSymbol];
    }

    // Convert from USD to target currency
    if (toSymbol === 'USD') {
      return usdAmount;
    }

    if (toSymbol === 'INR') {
      const usdToInrRate = fxRates.find(r => r.base === 'USD' && r.quote === 'INR');
      return usdToInrRate ? usdAmount * usdToInrRate.rate : usdAmount * 83.5;
    }

    if (staticRates[toSymbol]) {
      return usdAmount / staticRates[toSymbol];
    }

    return amount; // Fallback
  }, [fxRates]);

  // Update display currency
  const updateDisplayCurrency = useCallback(async (currency: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data } = await supabase
        .from('user_settings')
        .update({ display_currency: currency })
        .eq('user_id', user.id)
        .select()
        .single();

      if (data) {
        setUserSettings(data);
        setDisplayCurrency(currency);
      }
    } catch (error) {
      console.error('Error updating display currency:', error);
    }
  }, []);

  // Format currency value
  const formatCurrency = useCallback((amount: number, currency: string = displayCurrency): string => {
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    }

    if (currency === 'INR') {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    }

    // For crypto currencies
    return `${amount.toFixed(6)} ${currency}`;
  }, [displayCurrency]);

  // Format fiat currency
  const formatFiat = useCallback((amount: number, currency: string = 'USD'): string => {
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
    }

    if (currency === 'INR') {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
      }).format(amount);
    }

    return `${amount.toFixed(2)} ${currency}`;
  }, []);

  // Format coin amount
  const formatCoin = useCallback((amount: number, symbol: string): string => {
    return `${amount.toFixed(6)} ${symbol}`;
  }, []);

  return {
    fxRates,
    userSettings,
    displayCurrency,
    loading,
    convert,
    updateDisplayCurrency,
    formatCurrency,
    formatFiat,
    formatCoin
  };
};