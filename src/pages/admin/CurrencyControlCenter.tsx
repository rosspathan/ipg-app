import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import BSKRateManager from "@/components/admin/currency/BSKRateManager";
import CurrencyOverviewCards from "@/components/admin/currency/CurrencyOverviewCards";
import AdminBSKBalances from "@/components/AdminBSKBalances";
import AdminINRBalances from "@/components/admin/balance/AdminINRBalances";

interface CurrencyStats {
  bsk: {
    total_withdrawable: number;
    total_holding: number;
    total_supply: number;
    user_count: number;
  };
  inr: {
    total_balance: number;
    total_locked: number;
    total_deposited: number;
    total_withdrawn: number;
    user_count: number;
  };
  rate: {
    current_rate: number;
    last_updated: string;
  };
}

const CurrencyControlCenter = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CurrencyStats | null>(null);
  const { toast } = useToast();

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Fetch BSK circulation
      const { data: bskData, error: bskError } = await supabase
        .rpc('get_total_bsk_circulation');
      
      if (bskError) throw bskError;

      // Fetch INR stats
      const { data: inrData, error: inrError } = await supabase
        .rpc('get_inr_stats');
      
      if (inrError) throw inrError;

      // Fetch current BSK rate
      const { data: rateData, error: rateError } = await supabase
        .rpc('get_current_bsk_rate');
      
      if (rateError) throw rateError;

      // Get last rate update time
      const { data: rateHistory, error: rateHistoryError } = await supabase
        .from('bsk_rate_history')
        .select('created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setStats({
        bsk: bskData?.[0] || { total_withdrawable: 0, total_holding: 0, total_supply: 0, user_count: 0 },
        inr: inrData?.[0] || { total_balance: 0, total_locked: 0, total_deposited: 0, total_withdrawn: 0, user_count: 0 },
        rate: {
          current_rate: rateData || 1,
          last_updated: rateHistory?.created_at || new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error loading currency stats:', error);
      toast({
        title: "Error",
        description: "Failed to load currency statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Currency Control Center</h1>
          <p className="text-muted-foreground mt-1">
            Manage BSK and INR currencies, rates, and balances
          </p>
        </div>
        <Button onClick={loadStats} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      {stats && <CurrencyOverviewCards stats={stats} />}

      {/* BSK Rate Manager */}
      <BSKRateManager currentRate={stats?.rate.current_rate || 1} onRateUpdate={loadStats} />

      {/* Balance Management Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Balance Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="bsk-withdrawable" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="bsk-withdrawable">BSK Withdrawable</TabsTrigger>
              <TabsTrigger value="bsk-holding">BSK Holding</TabsTrigger>
              <TabsTrigger value="inr">INR Balances</TabsTrigger>
            </TabsList>
            
            <TabsContent value="bsk-withdrawable" className="mt-6">
              <AdminBSKBalances balanceType="withdrawable" />
            </TabsContent>
            
            <TabsContent value="bsk-holding" className="mt-6">
              <AdminBSKBalances balanceType="holding" />
            </TabsContent>
            
            <TabsContent value="inr" className="mt-6">
              <AdminINRBalances />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default CurrencyControlCenter;
