import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export const ManualDepositVerification = () => {
  const [txHash, setTxHash] = useState('0xd4b174c531aef2aa108536a1df6ee87f1f50763dded5d84f20e1c99fbaa4a6ec');
  const [assetSymbol, setAssetSymbol] = useState('IPG');
  const [amount, setAmount] = useState('1.0');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleVerify = async () => {
    if (!txHash || !txHash.startsWith('0x')) {
      toast({
        title: 'Invalid Transaction Hash',
        description: 'Please enter a valid transaction hash starting with 0x',
        variant: 'destructive',
      });
      return;
    }

    if (!assetSymbol || parseFloat(amount) <= 0) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a valid asset symbol and amount',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manual-credit-deposit', {
        body: { 
          txHash,
          assetSymbol,
          amount: parseFloat(amount)
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Deposit Credited!',
          description: data.message || `Successfully credited ${data.amount} ${data.symbol}`,
        });
        setTxHash('');
        // Refresh the page to show updated balance
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast({
          title: 'Credit Failed',
          description: data.message || (data.alreadyExists ? 'This transaction is already credited' : 'Failed to credit deposit'),
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Credit error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to credit transaction',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Manual Deposit Credit</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Manually credit your deposit by entering the transaction details
      </p>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Transaction Hash</label>
          <Input
            placeholder="0x..."
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Asset Symbol</label>
            <Input
              placeholder="IPG"
              value={assetSymbol}
              onChange={(e) => setAssetSymbol(e.target.value.toUpperCase())}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Amount</label>
            <Input
              type="number"
              step="0.000001"
              placeholder="1.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
        <Button onClick={handleVerify} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Credit Deposit'
          )}
        </Button>
      </div>
    </Card>
  );
};
