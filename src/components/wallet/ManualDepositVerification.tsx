import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export const ManualDepositVerification = () => {
  const [txHash, setTxHash] = useState('0xd4b174c531aef2aa108536a1df6ee87f1f50763dded5d84f20e1c99fbaa4a6ec');
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

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-transaction', {
        body: { txHash },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Deposit Verified!',
          description: data.message || `Successfully credited ${data.amount} ${data.symbol}`,
        });
        setTxHash('');
        // Refresh the page to show updated balance
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast({
          title: 'Verification Failed',
          description: data.message || 'Transaction could not be verified',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to verify transaction',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Manual Deposit Verification</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Enter your transaction hash to manually verify and credit your deposit
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="0x..."
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleVerify} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify & Credit'
          )}
        </Button>
      </div>
    </Card>
  );
};
