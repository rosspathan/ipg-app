import { useQuery } from '@tanstack/react-query';

// BSK rate: 1 BSK = $0.012 USD
const BSK_USD_RATE = 0.012;

export const useBSKExchangeRate = () => {
  return useQuery({
    queryKey: ['bsk-exchange-rate'],
    queryFn: async () => {
      // Fixed rate: 1 BSK = $0.012 USD
      return BSK_USD_RATE;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

export const formatBSKtoUSD = (bskAmount: number, rate: number = BSK_USD_RATE) => {
  const usdAmount = bskAmount * rate;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(usdAmount);
};

// Legacy function name for compatibility - now returns USD
export const formatBSKtoINR = formatBSKtoUSD;

export const BSK_RATE = BSK_USD_RATE;
