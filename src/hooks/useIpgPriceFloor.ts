import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface IpgFloorSettings {
  floorPrice: number;
  isActive: boolean;
}

/** True when the market's base asset is IPG (e.g. IPG/USDT). */
export function isIpgFloorSymbol(symbol?: string | null): boolean {
  if (!symbol) return false;
  return symbol.toUpperCase().split('/')[0] === 'IPG';
}

/** Clamps a displayed price up to the floor for IPG markets. */
export function applyIpgFloorToPrice(symbol: string, price: number, floorPrice: number): number {
  if (!isIpgFloorSymbol(symbol) || floorPrice <= 0) return price;
  return Math.max(price, floorPrice);
}

export const ipgFloorMessage = (floorPrice: number) =>
  `Trading below the admin-set minimum price (${floorPrice} USDT) is not allowed.`;

/**
 * Admin-controlled IPG price floor. Public read — every user on every device
 * gets the same value straight from the database.
 */
export function useIpgPriceFloor() {
  const query = useQuery({
    queryKey: ['ipg-price-floor'],
    queryFn: async (): Promise<IpgFloorSettings> => {
      const { data, error } = await (supabase as any)
        .from('ipg_price_floor_settings')
        .select('floor_price, is_active')
        .maybeSingle();

      if (error) {
        console.warn('[useIpgPriceFloor]', error);
        return { floorPrice: 0, isActive: false };
      }

      const isActive = !!data?.is_active;
      return {
        floorPrice: isActive ? Number(data?.floor_price ?? 0) : 0,
        isActive,
      };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return {
    floorPrice: query.data?.floorPrice ?? 0,
    isActive: query.data?.isActive ?? false,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
