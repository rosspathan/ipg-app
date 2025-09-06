import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface FiatSettings {
  id: string;
  enabled: boolean;
  min_deposit: number;
  fee_percent: number;
  fee_fixed: number;
  updated_at: string;
}

interface BankAccount {
  id: string;
  label: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  ifsc: string;
  notes?: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

interface UpiAccount {
  id: string;
  label: string;
  upi_id: string;
  upi_name: string;
  notes?: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

type FundingStatus = 'loading' | 'ready' | 'empty' | 'error' | 'disabled';

interface INRFundingState {
  status: FundingStatus;
  settings: FiatSettings | null;
  banks: BankAccount[];
  upis: UpiAccount[];
  lastRealtimeEvent?: string;
  error?: string;
}

export const useINRFunding = () => {
  const [state, setState] = useState<INRFundingState>({
    status: 'loading',
    settings: null,
    banks: [],
    upis: [],
  });

  const updateLastEvent = useCallback((event: string) => {
    setState(prev => ({ ...prev, lastRealtimeEvent: new Date().toISOString() + ' - ' + event }));
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('fiat_settings_inr')
        .select('id, enabled, min_deposit, fee_percent, fee_fixed, updated_at')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  }, []);

  const fetchBanks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('fiat_bank_accounts')
        .select('id, label, bank_name, account_name, account_number, ifsc, notes, is_default, is_active, created_at')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching banks:', error);
      throw error;
    }
  }, []);

  const fetchUpis = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('fiat_upi_accounts')
        .select('id, label, upi_id, upi_name, notes, is_default, is_active, created_at')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching UPIs:', error);
      throw error;
    }
  }, []);

  const loadAllData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, status: 'loading', error: undefined }));

      // Fetch all data in parallel with 10s timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000);
      });

      const dataPromise = Promise.all([
        fetchSettings(),
        fetchBanks(),
        fetchUpis()
      ]);

      const [settings, banks, upis] = await Promise.race([dataPromise, timeoutPromise]) as [
        FiatSettings | null,
        BankAccount[],
        UpiAccount[]
      ];

      // Determine status based on data
      let status: FundingStatus = 'ready';
      
      if (!settings) {
        status = 'error';
      } else if (!settings.enabled) {
        status = 'disabled';
      } else if (banks.length === 0 && upis.length === 0) {
        status = 'empty';
      }

      setState({
        status,
        settings,
        banks,
        upis,
        lastRealtimeEvent: state.lastRealtimeEvent,
        error: undefined,
      });
    } catch (error) {
      console.error('Error loading INR funding data:', error);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to load data',
      }));
    }
  }, [fetchSettings, fetchBanks, fetchUpis, state.lastRealtimeEvent]);

  useEffect(() => {
    loadAllData();

    // Set up realtime subscriptions
    const channels: RealtimeChannel[] = [];

    const settingsChannel = supabase
      .channel('fiat_settings_inr_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fiat_settings_inr' },
        (payload) => {
          updateLastEvent(`Settings ${payload.eventType}`);
          loadAllData();
        }
      )
      .subscribe();
    channels.push(settingsChannel);

    const bankChannel = supabase
      .channel('fiat_bank_accounts_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fiat_bank_accounts' },
        (payload) => {
          updateLastEvent(`Bank ${payload.eventType}`);
          loadAllData();
        }
      )
      .subscribe();
    channels.push(bankChannel);

    const upiChannel = supabase
      .channel('fiat_upi_accounts_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fiat_upi_accounts' },
        (payload) => {
          updateLastEvent(`UPI ${payload.eventType}`);
          loadAllData();
        }
      )
      .subscribe();
    channels.push(upiChannel);

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [loadAllData, updateLastEvent]);

  const refetch = useCallback(() => {
    loadAllData();
  }, [loadAllData]);

  return {
    ...state,
    refetch,
  };
};