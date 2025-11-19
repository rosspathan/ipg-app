import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useBSKExchangeRate = () => {
  return useQuery({
    queryKey: ['bsk-exchange-rate'],
    queryFn: async () => {
      // Default rate: 85 INR per BSK
      // In production, fetch from your price feed
      return 85;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

export const formatBSKtoINR = (bskAmount: number, rate: number) => {
  const inrAmount = bskAmount * rate;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(inrAmount);
};
