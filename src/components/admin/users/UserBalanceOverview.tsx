import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { CleanGrid } from "@/components/admin/clean/CleanGrid";
import { Wallet, TrendingUp, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";

interface UserBalanceOverviewProps {
  userId: string;
}

export function UserBalanceOverview({ userId }: UserBalanceOverviewProps) {
  const isMobile = useIsMobile();
  
  const { data: bskBalance, isLoading: loadingBSK } = useQuery({
    queryKey: ["user-bsk-balance", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_bsk_balances")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: inrBalance, isLoading: loadingINR } = useQuery({
    queryKey: ["user-inr-balance", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_inr_balances")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: cryptoBalances, isLoading: loadingCrypto } = useQuery({
    queryKey: ["user-crypto-balances", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_balances")
        .select(`
          *,
          assets:asset_id (symbol, name, logo_url)
        `)
        .eq("user_id", userId);

      if (error) throw error;
      return data;
    },
  });

  if (loadingBSK || loadingINR || loadingCrypto) {
    return (
      <CleanGrid cols={isMobile ? 1 : 3} gap="md">
        {[1, 2, 3].map((i) => (
          <CleanCard key={i} padding="md">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32" />
          </CleanCard>
        ))}
      </CleanGrid>
    );
  }

  return (
    <div className="space-y-4">
      <CleanGrid cols={isMobile ? 1 : 3} gap="md">
        <CleanCard padding="md">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h4 className="text-sm font-medium text-[hsl(0_0%_98%)]">BSK Balance</h4>
            <Wallet className="h-4 w-4 text-[hsl(262_100%_65%)]" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-[hsl(0_0%_98%)]">
              {(bskBalance?.withdrawable_balance || 0).toFixed(2)} BSK
            </div>
            <p className="text-xs text-[hsl(240_10%_70%)] mt-1">
              Withdrawable: {(bskBalance?.withdrawable_balance || 0).toFixed(2)}
            </p>
            <p className="text-xs text-[hsl(240_10%_70%)]">
              Holding: {(bskBalance?.holding_balance || 0).toFixed(2)}
            </p>
          </div>
        </CleanCard>

        <CleanCard padding="md">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h4 className="text-sm font-medium text-[hsl(0_0%_98%)]">INR Balance</h4>
            <TrendingUp className="h-4 w-4 text-[hsl(262_100%_65%)]" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-[hsl(0_0%_98%)]">
              ₹{(inrBalance?.balance || 0).toFixed(2)}
            </div>
            <p className="text-xs text-[hsl(240_10%_70%)] mt-1">
              Locked: ₹{(inrBalance?.locked || 0).toFixed(2)}
            </p>
          </div>
        </CleanCard>

        <CleanCard padding="md">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h4 className="text-sm font-medium text-[hsl(0_0%_98%)]">Crypto Assets</h4>
            <Lock className="h-4 w-4 text-[hsl(262_100%_65%)]" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-[hsl(0_0%_98%)]">{cryptoBalances?.length || 0}</div>
            <p className="text-xs text-[hsl(240_10%_70%)] mt-1">Different assets</p>
          </div>
        </CleanCard>
      </CleanGrid>

      {cryptoBalances && cryptoBalances.length > 0 && (
        <CleanCard padding="md">
          <h4 className="font-semibold text-[hsl(0_0%_98%)] mb-3">Crypto Asset Details</h4>
          <div className="space-y-2">
            {cryptoBalances.map((balance: any) => (
              <div key={balance.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-[hsl(220_13%_10%)] border border-[hsl(220_13%_14%/0.4)] rounded-lg gap-2">
                <div className="flex items-center gap-2">
                  {balance.assets?.logo_url && (
                    <img src={balance.assets.logo_url} alt="" className="h-6 w-6" />
                  )}
                  <div>
                    <div className="font-medium text-[hsl(0_0%_98%)]">{balance.assets?.symbol}</div>
                    <div className="text-xs text-[hsl(240_10%_70%)]">{balance.assets?.name}</div>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="font-medium text-[hsl(0_0%_98%)]">{parseFloat(balance.available).toFixed(6)}</div>
                  <div className="text-xs text-[hsl(240_10%_70%)]">
                    Locked: {parseFloat(balance.locked).toFixed(6)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CleanCard>
      )}
    </div>
  );
}
