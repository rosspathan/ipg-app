import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowDown, ArrowUp, Send, ArrowRightLeft, ExternalLink, Repeat } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const HistoryScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [swaps, setSwaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSwaps();
    }
  }, [user]);

  const loadSwaps = async () => {
    try {
      const { data, error } = await supabase
        .from('swaps')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        setSwaps(data.map(swap => ({
          date: new Date(swap.created_at).toLocaleDateString(),
          fromAsset: swap.from_asset,
          toAsset: swap.to_asset,
          fromAmount: swap.from_amount.toString(),
          toAmount: swap.to_amount.toString(),
          route: swap.route_type,
          fee: `${swap.total_fees.toFixed(4)} ${swap.from_asset}`,
          status: swap.status === 'completed' ? 'Completed' : 
                  swap.status === 'failed' ? 'Failed' : 'Processing',
          txId: swap.id
        })));
      }
    } catch (error) {
      console.error('Error loading swaps:', error);
    } finally {
      setLoading(false);
    }
  };

  const deposits = [
    {
      date: "2024-01-20",
      asset: "BTC",
      amount: "0.001",
      fee: "Free",
      status: "Completed",
      txId: "d1e2f3g4h5i6j7k8l9m0n1o2p3q4r5s6t7u8v9w0x1y2z3a4b5c6d7e8f9g0h1i2"
    },
    {
      date: "2024-01-19",
      asset: "ETH",
      amount: "0.5",
      fee: "Free",
      status: "Completed",
      txId: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
    },
    {
      date: "2024-01-18",
      asset: "USDT",
      amount: "1000.00",
      fee: "Free",
      status: "Processing",
      txId: "p1q2r3s4t5u6v7w8x9y0z1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2"
    }
  ];

  const withdrawals = [
    {
      date: "2024-01-19",
      asset: "BTC",
      amount: "0.0005",
      fee: "0.0001",
      status: "Completed",
      txId: "w1x2y3z4a5b6c7d8e9f0g1h2i3j4k5l6m7n8o9p0q1r2s3t4u5v6w7x8y9z0a1b2"
    }
  ];

  const sends = [
    {
      date: "2024-01-20",
      asset: "ETH",
      amount: "0.1",
      fee: "0.001",
      status: "Completed",
      recipient: "user@example.com",
      txId: "TXN4B5C6D7E8F9"
    },
    {
      date: "2024-01-18",
      asset: "USDT",
      amount: "50.00",
      fee: "0.50",
      status: "Completed",
      recipient: "john_crypto",
      txId: "TXNA1B2C3D4E5"
    }
  ];

  const transfers = [
    {
      date: "2024-01-20",
      asset: "BTC",
      amount: "0.001",
      fee: "Free",
      status: "Completed",
      from: "Main Wallet",
      to: "Trading Wallet",
      txId: "INT7F8G9H0I1J2"
    },
    {
      date: "2024-01-19",
      asset: "USDC",
      amount: "200.00",
      fee: "Free",
      status: "Completed",
      from: "Trading Wallet",
      to: "Savings Wallet",
      txId: "INTK3L4M5N6O7"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "text-green-600";
      case "Processing":
        return "text-yellow-600";
      case "Failed":
        return "text-red-600";
      default:
        return "text-muted-foreground";
    }
  };

  const SwapCard = ({ swap }: { swap: any }) => (
    <Card className="bg-gradient-card shadow-card border-0 mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Repeat className="w-4 h-4 text-blue-600" />
            <span className="font-semibold">{swap.fromAsset} → {swap.toAsset}</span>
          </div>
          <span className={`text-sm font-medium ${getStatusColor(swap.status)}`}>
            {swap.status}
          </span>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span>{swap.date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">From</span>
            <span className="font-medium">{swap.fromAmount} {swap.fromAsset}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">To</span>
            <span className="font-medium">{swap.toAmount} {swap.toAsset}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Route</span>
            <span className="capitalize">{swap.route}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fee</span>
            <span>{swap.fee}</span>
          </div>
          
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-muted-foreground">Swap ID</span>
            <div className="flex items-center space-x-1">
              <span className="font-mono text-xs">{swap.txId.slice(0, 8)}...{swap.txId.slice(-8)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
  const TransactionCard = ({ transaction, type }: { transaction: any; type: string }) => (
    <Card className="bg-gradient-card shadow-card border-0 mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            {type === "deposit" && <ArrowDown className="w-4 h-4 text-green-600" />}
            {type === "withdrawal" && <ArrowUp className="w-4 h-4 text-red-600" />}
            {type === "send" && <Send className="w-4 h-4 text-blue-600" />}
            {type === "transfer" && <ArrowRightLeft className="w-4 h-4 text-purple-600" />}
            <span className="font-semibold">{transaction.asset}</span>
          </div>
          <span className={`text-sm font-medium ${getStatusColor(transaction.status)}`}>
            {transaction.status}
          </span>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span>{transaction.date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-medium">{transaction.amount} {transaction.asset}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fee</span>
            <span>{transaction.fee}</span>
          </div>
          
          {transaction.recipient && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">To</span>
              <span>{transaction.recipient}</span>
            </div>
          )}
          
          {transaction.from && transaction.to && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transfer</span>
              <span className="text-xs">{transaction.from} → {transaction.to}</span>
            </div>
          )}
          
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-muted-foreground">TxID</span>
            <div className="flex items-center space-x-1">
              <span className="font-mono text-xs">{transaction.txId.slice(0, 8)}...{transaction.txId.slice(-8)}</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground cursor-pointer" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-sm mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/app/wallet")}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Transaction History</h1>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="deposits" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="deposits">Deposits</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="sends">Sends</TabsTrigger>
            <TabsTrigger value="swaps">Swaps</TabsTrigger>
            <TabsTrigger value="transfers">Transfers</TabsTrigger>
          </TabsList>
          
          <TabsContent value="deposits" className="mt-6">
            <div className="space-y-3">
              {deposits.map((transaction, index) => (
                <TransactionCard key={index} transaction={transaction} type="deposit" />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="withdrawals" className="mt-6">
            <div className="space-y-3">
              {withdrawals.map((transaction, index) => (
                <TransactionCard key={index} transaction={transaction} type="withdrawal" />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="sends" className="mt-6">
            <div className="space-y-3">
              {sends.map((transaction, index) => (
                <TransactionCard key={index} transaction={transaction} type="send" />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="swaps" className="mt-6">
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-4">Loading swaps...</div>
              ) : swaps.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No swaps yet
                </div>
              ) : (
                swaps.map((swap, index) => (
                  <SwapCard key={index} swap={swap} />
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="transfers" className="mt-6">
            <div className="space-y-3">
              {transfers.map((transaction, index) => (
                <TransactionCard key={index} transaction={transaction} type="transfer" />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default HistoryScreen;