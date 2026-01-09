import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { toast } from "sonner";

export interface TradingBalance {
  symbol: string;
  name: string;
  balance: number;
  available: number;
  locked: number;
  logo_url?: string;
  usd_value?: number;
  asset_id: string;
}

export interface TransferRequest {
  asset_id: string;
  amount: number;
  direction: "to_trading" | "from_trading";
}

/**
 * Hook to fetch REAL trading balances from wallet_balances table.
 * These balances are ONLY credited when users deposit to the hot wallet.
 * Do NOT confuse with on-chain balances which are for display only.
 */
export function useTradingBalances() {
  const { user } = useAuthUser();

  return useQuery({
    queryKey: ["trading-balances", user?.id],
    queryFn: async (): Promise<TradingBalance[]> => {
      if (!user?.id) return [];

      // Fetch wallet_balances - ONLY contains real custodial deposits
      const { data: balances, error } = await supabase
        .from("wallet_balances")
        .select(`
          id,
          available,
          locked,
          total,
          asset_id,
          assets (
            symbol,
            name,
            logo_url
          )
        `)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching trading balances:", error);
        throw error;
      }

      // Fetch prices for USD values
      const { data: prices } = await supabase
        .from("market_prices")
        .select("symbol, current_price");

      const priceMap = new Map(
        prices?.map((p) => [p.symbol?.split('/')[0], p.current_price]) || []
      );

      return (balances || []).map((b) => {
        const asset = b.assets as { symbol: string; name: string; logo_url?: string } | null;
        const price = priceMap.get(asset?.symbol || "") || 0;
        const available = Number(b.available) || 0;
        const locked = Number(b.locked) || 0;
        const total = available + locked;
        
        return {
          symbol: asset?.symbol || "Unknown",
          name: asset?.name || "Unknown",
          balance: total,
          available: available,
          locked: locked,
          logo_url: asset?.logo_url,
          usd_value: total * price,
          asset_id: b.asset_id,
        };
      }).filter(b => b.balance > 0.000001); // Only show non-zero balances
    },
    enabled: !!user?.id,
    staleTime: 10000,
  });
}

/**
 * Hook to handle transfers to/from trading balance.
 * - TO_TRADING: User sends funds to hot wallet, credited after confirmation
 * - FROM_TRADING: User withdraws from trading balance to their wallet
 */
export function useTradingTransfer() {
  const queryClient = useQueryClient();
  const { user } = useAuthUser();

  return useMutation({
    mutationFn: async (request: TransferRequest) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Create transfer record
      const { data: transfer, error: insertError } = await supabase
        .from("trading_balance_transfers")
        .insert({
          user_id: user.id,
          asset_id: request.asset_id,
          direction: request.direction,
          amount: request.amount,
          status: "pending",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Call edge function to process the transfer
      const { data, error } = await supabase.functions.invoke(
        "transfer-to-trading",
        {
          body: {
            transfer_id: transfer.id,
            direction: request.direction,
          },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.status === "awaiting_deposit") {
        toast.info("Deposit Instructions", {
          description: `Send funds to ${data.deposit_address?.slice(0, 10)}...`,
          duration: 10000,
        });
      } else if (data?.status === "withdrawal_queued") {
        toast.success("Withdrawal Queued", {
          description: data.message,
        });
      } else {
        toast.success("Transfer initiated successfully");
      }
      queryClient.invalidateQueries({ queryKey: ["trading-balances"] });
      queryClient.invalidateQueries({ queryKey: ["user-balance"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-balances"] });
      queryClient.invalidateQueries({ queryKey: ["bep20-balances"] });
    },
    onError: (error) => {
      console.error("Transfer error:", error);
      toast.error(error.message || "Transfer failed");
    },
  });
}

/**
 * Hook to get the platform hot wallet address for deposits
 */
export function useHotWalletAddress() {
  return useQuery({
    queryKey: ["hot-wallet-address"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_hot_wallet")
        .select("address")
        .eq("is_active", true)
        .eq("chain", "BSC")
        .single();

      if (error) {
        console.error("Error fetching hot wallet:", error);
        return null;
      }

      return data?.address || null;
    },
    staleTime: 60000, // Cache for 1 minute
  });
}
