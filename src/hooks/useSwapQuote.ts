import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface MarketPrice {
  symbol: string;
  current_price: number;
  last_updated: string;
}

interface SwapRoute {
  type: 'direct' | '2hop';
  path: string[]; // e.g. ['IPG', 'USDT'] or ['IPG', 'USDT', 'BTC']
  rate: number;
  inverseRate: number;
}

interface SwapQuote {
  route: SwapRoute | null;
  estimatedOutput: number;
  platformFeePercent: number;
  platformFeeAmount: number;
  minReceive: number;
  priceImpact: number;
  quoteTimestamp: number;
  isExpired: boolean;
  secondsRemaining: number;
  routeAvailable: boolean;
  fromBalance: number;
  isLoadingBalance: boolean;
  isLoadingPrices: boolean;
  refreshQuote: () => void;
}

const QUOTE_TTL_SECONDS = 15;
const REFETCH_INTERVAL = 10000; // 10 seconds

/**
 * Resolves the swap rate between two assets using market_prices table.
 * Tries: direct pair → reverse pair → 2-hop via USDT
 */
function resolveRoute(
  prices: MarketPrice[],
  fromAsset: string,
  toAsset: string
): SwapRoute | null {
  if (fromAsset === toAsset) return null;

  // Helper to find price for a symbol
  const findPrice = (symbol: string): number | null => {
    const entry = prices.find(p => p.symbol === symbol);
    return entry ? entry.current_price : null;
  };

  // 1. Direct pair: fromAsset/toAsset
  const directSymbol = `${fromAsset}/${toAsset}`;
  const directPrice = findPrice(directSymbol);
  if (directPrice && directPrice > 0) {
    return {
      type: 'direct',
      path: [fromAsset, toAsset],
      rate: directPrice,
      inverseRate: 1 / directPrice,
    };
  }

  // 2. Reverse pair: toAsset/fromAsset → invert
  const reverseSymbol = `${toAsset}/${fromAsset}`;
  const reversePrice = findPrice(reverseSymbol);
  if (reversePrice && reversePrice > 0) {
    return {
      type: 'direct',
      path: [fromAsset, toAsset],
      rate: 1 / reversePrice,
      inverseRate: reversePrice,
    };
  }

  // 3. 2-hop via USDT
  if (fromAsset !== 'USDT' && toAsset !== 'USDT') {
    // Get fromAsset price in USDT
    let fromToUsdt: number | null = null;
    const fromUsdtDirect = findPrice(`${fromAsset}/USDT`);
    if (fromUsdtDirect && fromUsdtDirect > 0) {
      fromToUsdt = fromUsdtDirect;
    } else {
      const usdtFromReverse = findPrice(`USDT/${fromAsset}`);
      if (usdtFromReverse && usdtFromReverse > 0) {
        fromToUsdt = 1 / usdtFromReverse;
      }
    }

    // Get toAsset price in USDT
    let toToUsdt: number | null = null;
    const toUsdtDirect = findPrice(`${toAsset}/USDT`);
    if (toUsdtDirect && toUsdtDirect > 0) {
      toToUsdt = toUsdtDirect;
    } else {
      const usdtToReverse = findPrice(`USDT/${toAsset}`);
      if (usdtToReverse && usdtToReverse > 0) {
        toToUsdt = 1 / usdtToReverse;
      }
    }

    if (fromToUsdt && toToUsdt) {
      const rate = fromToUsdt / toToUsdt;
      return {
        type: '2hop',
        path: [fromAsset, 'USDT', toAsset],
        rate,
        inverseRate: 1 / rate,
      };
    }

    // Also try 2-hop via USDI
    let fromToUsdi: number | null = null;
    const fromUsdiDirect = findPrice(`${fromAsset}/USDI`);
    if (fromUsdiDirect && fromUsdiDirect > 0) {
      fromToUsdi = fromUsdiDirect;
    } else {
      const usdiFromReverse = findPrice(`USDI/${fromAsset}`);
      if (usdiFromReverse && usdiFromReverse > 0) {
        fromToUsdi = 1 / usdiFromReverse;
      }
    }

    let toToUsdi: number | null = null;
    const toUsdiDirect = findPrice(`${toAsset}/USDI`);
    if (toUsdiDirect && toUsdiDirect > 0) {
      toToUsdi = toUsdiDirect;
    } else {
      const usdiToReverse = findPrice(`USDI/${toAsset}`);
      if (usdiToReverse && usdiToReverse > 0) {
        toToUsdi = 1 / usdiToReverse;
      }
    }

    if (fromToUsdi && toToUsdi) {
      const rate = fromToUsdi / toToUsdi;
      return {
        type: '2hop',
        path: [fromAsset, 'USDI', toAsset],
        rate,
        inverseRate: 1 / rate,
      };
    }
  }

  return null;
}

export function useSwapQuote(
  fromAsset: string,
  toAsset: string,
  fromAmount: string,
  slippagePercent: number
): SwapQuote {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [quoteTimestamp, setQuoteTimestamp] = useState(Date.now());
  const [secondsRemaining, setSecondsRemaining] = useState(QUOTE_TTL_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Fetch all market prices
  const { data: marketPrices, isLoading: isLoadingPrices, refetch: refetchPrices } = useQuery({
    queryKey: ['swap-market-prices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_prices')
        .select('symbol, current_price, last_updated');
      if (error) throw error;
      return (data || []) as MarketPrice[];
    },
    refetchInterval: REFETCH_INTERVAL,
    staleTime: 5000,
  });

  // Fetch user's balance for the fromAsset
  const { data: fromBalance = 0, isLoading: isLoadingBalance } = useQuery({
    queryKey: ['swap-balance', user?.id, fromAsset],
    queryFn: async () => {
      if (!user || !fromAsset) return 0;

      // Look up asset_id by symbol
      const { data: asset } = await supabase
        .from('assets')
        .select('id')
        .eq('symbol', fromAsset)
        .eq('is_active', true)
        .maybeSingle();

      if (!asset) return 0;

      const { data: balance } = await supabase
        .from('wallet_balances')
        .select('available')
        .eq('user_id', user.id)
        .eq('asset_id', asset.id)
        .maybeSingle();

      return balance?.available || 0;
    },
    enabled: !!user && !!fromAsset,
    refetchInterval: 15000,
  });

  // Update quote timestamp when prices refresh
  useEffect(() => {
    if (marketPrices) {
      setQuoteTimestamp(Date.now());
      setSecondsRemaining(QUOTE_TTL_SECONDS);
    }
  }, [marketPrices]);

  // Countdown timer
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          refetchPrices();
          return QUOTE_TTL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refetchPrices]);

  const route = useMemo(() => {
    if (!fromAsset || !toAsset || !marketPrices?.length) return null;
    return resolveRoute(marketPrices, fromAsset, toAsset);
  }, [fromAsset, toAsset, marketPrices]);

  const quote = useMemo((): Omit<SwapQuote, 'fromBalance' | 'isLoadingBalance' | 'isLoadingPrices' | 'refreshQuote'> => {
    const amount = parseFloat(fromAmount) || 0;
    const isExpired = (Date.now() - quoteTimestamp) > QUOTE_TTL_SECONDS * 1000;

    if (!route || amount <= 0) {
      return {
        route,
        estimatedOutput: 0,
        platformFeePercent: 0.5,
        platformFeeAmount: 0,
        minReceive: 0,
        priceImpact: 0,
        quoteTimestamp,
        isExpired,
        secondsRemaining,
        routeAvailable: !!route,
      };
    }

    const feePercent = 0.5;
    const grossOutput = amount * route.rate;
    const feeAmount = grossOutput * (feePercent / 100);
    const estimatedOutput = grossOutput - feeAmount;
    const minReceive = estimatedOutput * (1 - slippagePercent / 100);

    // Price impact is negligible for internal bookkeeping swaps
    // In a real orderbook, this would be calculated from depth
    const priceImpact = 0;

    return {
      route,
      estimatedOutput,
      platformFeePercent: feePercent,
      platformFeeAmount: feeAmount,
      minReceive,
      priceImpact,
      quoteTimestamp,
      isExpired,
      secondsRemaining,
      routeAvailable: true,
    };
  }, [route, fromAmount, slippagePercent, quoteTimestamp, secondsRemaining]);

  const refreshQuote = useCallback(() => {
    refetchPrices();
    queryClient.invalidateQueries({ queryKey: ['swap-balance', user?.id, fromAsset] });
  }, [refetchPrices, queryClient, user?.id, fromAsset]);

  return {
    ...quote,
    fromBalance,
    isLoadingBalance,
    isLoadingPrices,
    refreshQuote,
  };
}
