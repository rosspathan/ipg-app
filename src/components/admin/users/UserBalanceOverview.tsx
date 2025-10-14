import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, TrendingUp, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface UserBalanceOverviewProps {
  userId: string;
}

export function UserBalanceOverview({ userId }: UserBalanceOverviewProps) {
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
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">BSK Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(bskBalance?.withdrawable_balance || 0).toFixed(2)} BSK
            </div>
            <p className="text-xs text-muted-foreground">
              Withdrawable: {(bskBalance?.withdrawable_balance || 0).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              Holding: {(bskBalance?.holding_balance || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">INR Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(inrBalance?.balance || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Locked: ₹{(inrBalance?.locked || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crypto Assets</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cryptoBalances?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Different assets</p>
          </CardContent>
        </Card>
      </div>

      {cryptoBalances && cryptoBalances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Crypto Asset Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cryptoBalances.map((balance: any) => (
                <div key={balance.id} className="flex justify-between items-center p-2 border rounded">
                  <div className="flex items-center gap-2">
                    {balance.assets?.logo_url && (
                      <img src={balance.assets.logo_url} alt="" className="h-6 w-6" />
                    )}
                    <div>
                      <div className="font-medium">{balance.assets?.symbol}</div>
                      <div className="text-xs text-muted-foreground">{balance.assets?.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{parseFloat(balance.available).toFixed(6)}</div>
                    <div className="text-xs text-muted-foreground">
                      Locked: {parseFloat(balance.locked).toFixed(6)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
