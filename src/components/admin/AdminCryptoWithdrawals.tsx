import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CryptoWithdrawal {
  id: string;
  user_id: string;
  amount: number;
  fee: number;
  net_amount: number;
  to_address: string;
  network: string;
  status: string;
  tx_hash: string | null;
  created_at: string;
  approved_at: string | null;
  assets: {
    symbol: string;
    name: string;
  };
  user_email?: string;
}

export const AdminCryptoWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState<CryptoWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadWithdrawals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select(`
          *,
          assets (symbol, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error: any) {
      console.error('Error loading crypto withdrawals:', error);
      toast({
        title: "Error",
        description: "Failed to load crypto withdrawals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      processing: { variant: "default", label: "Processing" },
      completed: { variant: "secondary", label: "Completed" },
      failed: { variant: "destructive", label: "Failed" },
      cancelled: { variant: "outline", label: "Cancelled" }
    };

    const config = statusConfig[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getExplorerUrl = (txHash: string, network: string) => {
    const explorers: Record<string, string> = {
      BEP20: 'https://bscscan.com/tx/',
      BSC: 'https://bscscan.com/tx/',
      ERC20: 'https://etherscan.io/tx/',
      ETH: 'https://etherscan.io/tx/'
    };
    return `${explorers[network] || explorers.BSC}${txHash}`;
  };

  const processingWithdrawals = withdrawals.filter(w => w.status === 'processing');
  const completedWithdrawals = withdrawals.filter(w => w.status === 'completed');
  const failedWithdrawals = withdrawals.filter(w => w.status === 'failed' || w.status === 'cancelled');

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const WithdrawalTable = ({ data }: { data: CryptoWithdrawal[] }) => (
    <div className="space-y-4">
      {data.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No withdrawals found</p>
      ) : (
        data.map((withdrawal) => (
          <Card key={withdrawal.id}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      User: {withdrawal.user_id.substring(0, 8)}...
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(withdrawal.created_at).toLocaleString()}
                    </p>
                  </div>
                  {getStatusBadge(withdrawal.status)}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Asset:</span>
                    <span className="ml-2 font-medium">{withdrawal.assets.symbol}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="ml-2 font-medium">{withdrawal.amount}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fee:</span>
                    <span className="ml-2">{withdrawal.fee}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Net:</span>
                    <span className="ml-2 font-medium">{withdrawal.net_amount}</span>
                  </div>
                </div>

                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">To:</span>
                    <span className="ml-2 font-mono text-xs break-all">{withdrawal.to_address}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Network:</span>
                    <span className="ml-2">{withdrawal.network}</span>
                  </div>
                  {withdrawal.tx_hash && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">TX Hash:</span>
                      <a
                        href={getExplorerUrl(withdrawal.tx_hash, withdrawal.network)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 font-mono text-xs"
                      >
                        {withdrawal.tx_hash.substring(0, 10)}...{withdrawal.tx_hash.substring(withdrawal.tx_hash.length - 8)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Crypto withdrawals are processed automatically. No admin approval required.
        </p>
        <Button variant="outline" size="sm" onClick={loadWithdrawals}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="processing" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="processing">
            Processing ({processingWithdrawals.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedWithdrawals.length})
          </TabsTrigger>
          <TabsTrigger value="failed">
            Failed ({failedWithdrawals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="processing">
          <WithdrawalTable data={processingWithdrawals} />
        </TabsContent>

        <TabsContent value="completed">
          <WithdrawalTable data={completedWithdrawals} />
        </TabsContent>

        <TabsContent value="failed">
          <WithdrawalTable data={failedWithdrawals} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
