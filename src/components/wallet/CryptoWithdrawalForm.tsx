import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowUpRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBep20Balances, Bep20Balance } from '@/hooks/useBep20Balances';
import { supabase } from '@/integrations/supabase/client';
import { validateCryptoAddress } from '@/lib/validation/cryptoAddressValidator';

interface WithdrawalResult {
  success: boolean;
  withdrawal_id?: string;
  tx_hash?: string;
  amount?: number;
  fee?: number;
  destination?: string;
  error?: string;
}

export function CryptoWithdrawalForm() {
  const { balances, isLoading: balancesLoading } = useBep20Balances();
  const { toast } = useToast();
  
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [destinationAddress, setDestinationAddress] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<WithdrawalResult | null>(null);
  const [addressError, setAddressError] = useState<string>('');

  // Get withdrawable assets (those with positive internal balance)
  const withdrawableAssets = balances.filter(b => b.appAvailable > 0);
  const selectedBalance = balances.find(b => b.symbol === selectedAsset);

  const handleAddressChange = (address: string) => {
    setDestinationAddress(address);
    setAddressError('');
    
    if (address && address.length > 10) {
      const validation = validateCryptoAddress(address, 'BEP20');
      if (!validation.isValid) {
        setAddressError(validation.error || 'Invalid address');
      }
    }
  };

  const handleMaxClick = () => {
    if (selectedBalance) {
      // Account for any withdrawal fee (would need to fetch from asset config)
      setAmount(selectedBalance.appAvailable.toString());
    }
  };

  const handleWithdraw = async () => {
    if (!selectedAsset || !amount || !destinationAddress) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all fields',
        variant: 'destructive'
      });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        variant: 'destructive'
      });
      return;
    }

    if (selectedBalance && numAmount > selectedBalance.appAvailable) {
      toast({
        title: 'Insufficient Balance',
        description: `You only have ${selectedBalance.appAvailable} ${selectedAsset} available`,
        variant: 'destructive'
      });
      return;
    }

    const validation = validateCryptoAddress(destinationAddress, 'BEP20');
    if (!validation.isValid) {
      toast({
        title: 'Invalid Address',
        description: validation.error || 'Please enter a valid BEP20 address',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('process-crypto-withdrawal', {
        body: {
          asset_symbol: selectedAsset,
          amount: numAmount,
          destination_address: destinationAddress,
          network: 'BEP20'
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        setResult(data);
        toast({
          title: 'Withdrawal Successful',
          description: `${data.amount} ${selectedAsset} sent to ${destinationAddress.slice(0, 8)}...`,
        });
        // Reset form
        setAmount('');
        setDestinationAddress('');
      } else {
        setResult({ success: false, error: data?.error || 'Withdrawal failed' });
        toast({
          title: 'Withdrawal Failed',
          description: data?.error || 'Please try again later',
          variant: 'destructive'
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setResult({ success: false, error: errorMessage });
      toast({
        title: 'Withdrawal Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (balancesLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpRight className="w-5 h-5" />
          Withdraw Crypto
        </CardTitle>
        <CardDescription>
          Withdraw your internal balance to an external wallet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Asset Selection */}
        <div className="space-y-2">
          <Label>Select Asset</Label>
          <Select value={selectedAsset} onValueChange={setSelectedAsset}>
            <SelectTrigger>
              <SelectValue placeholder="Choose asset to withdraw" />
            </SelectTrigger>
            <SelectContent>
              {withdrawableAssets.length === 0 ? (
                <SelectItem value="none" disabled>No withdrawable assets</SelectItem>
              ) : (
                withdrawableAssets.map(asset => (
                  <SelectItem key={asset.assetId} value={asset.symbol}>
                    <div className="flex items-center justify-between w-full">
                      <span>{asset.symbol}</span>
                      <Badge variant="secondary" className="ml-2">
                        {asset.appAvailable.toFixed(4)}
                      </Badge>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {selectedBalance && (
            <p className="text-xs text-muted-foreground">
              Available: {selectedBalance.appAvailable.toFixed(8)} {selectedAsset}
            </p>
          )}
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label>Amount</Label>
          <div className="relative">
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pr-16"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs"
              onClick={handleMaxClick}
              disabled={!selectedBalance}
            >
              MAX
            </Button>
          </div>
        </div>

        {/* Destination Address */}
        <div className="space-y-2">
          <Label>Destination Address (BEP20)</Label>
          <Input
            placeholder="0x..."
            value={destinationAddress}
            onChange={(e) => handleAddressChange(e.target.value)}
            className={addressError ? 'border-destructive' : ''}
          />
          {addressError && (
            <p className="text-xs text-destructive">{addressError}</p>
          )}
        </div>

        {/* Network Info */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Ensure the destination address supports BEP20 (BSC network). 
            Sending to wrong network may result in permanent loss.
          </AlertDescription>
        </Alert>

        {/* Result Display */}
        {result && (
          <Alert variant={result.success ? 'default' : 'destructive'}>
            {result.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertDescription>
              {result.success ? (
                <div className="space-y-1">
                  <p>Withdrawal successful!</p>
                  {result.tx_hash && (
                    <a
                      href={`https://bscscan.com/tx/${result.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline text-xs"
                    >
                      View transaction →
                    </a>
                  )}
                </div>
              ) : (
                result.error
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <Button
          className="w-full"
          onClick={handleWithdraw}
          disabled={isProcessing || !selectedAsset || !amount || !destinationAddress || !!addressError}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Withdraw {selectedAsset || 'Crypto'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
