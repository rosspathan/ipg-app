import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useBSKLedgers } from '@/hooks/useBSKLedgers';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Banknote, Bitcoin } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const BSKWithdrawalForm = () => {
  const { user } = useAuthUser();
  const { balances, loading } = useBSKLedgers();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [withdrawalType, setWithdrawalType] = useState<'bank' | 'crypto'>('bank');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Bank details
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');

  // Crypto details
  const [cryptoSymbol, setCryptoSymbol] = useState('BTC');
  const [cryptoAddress, setCryptoAddress] = useState('');
  const [cryptoNetwork, setCryptoNetwork] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid withdrawal amount',
        variant: 'destructive'
      });
      return;
    }

    if (!balances || amountNum > balances.withdrawable_balance) {
      toast({
        title: 'Insufficient Balance',
        description: 'You do not have enough withdrawable BSK',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);

    try {
      const requestData: any = {
        amount_bsk: amountNum,
        withdrawal_type: withdrawalType
      };

      if (withdrawalType === 'bank') {
        if (!bankName || !accountNumber || !ifscCode || !accountHolderName) {
          toast({
            title: 'Missing Information',
            description: 'Please fill in all bank details',
            variant: 'destructive'
          });
          setSubmitting(false);
          return;
        }
        requestData.bank_name = bankName;
        requestData.account_number = accountNumber;
        requestData.ifsc_code = ifscCode;
        requestData.account_holder_name = accountHolderName;
      } else {
        if (!cryptoAddress || !cryptoNetwork) {
          toast({
            title: 'Missing Information',
            description: 'Please fill in all crypto details',
            variant: 'destructive'
          });
          setSubmitting(false);
          return;
        }
        requestData.crypto_symbol = cryptoSymbol;
        requestData.crypto_address = cryptoAddress;
        requestData.crypto_network = cryptoNetwork;
      }

      const { data, error } = await supabase.functions.invoke('process-bsk-withdrawal', {
        body: requestData
      });

      if (error) throw error;

      toast({
        title: 'Withdrawal Request Submitted',
        description: data.message || 'Your request has been sent to admin for processing'
      });

      // Reset form
      setAmount('');
      setBankName('');
      setAccountNumber('');
      setIfscCode('');
      setAccountHolderName('');
      setCryptoAddress('');
      setCryptoNetwork('');

      navigate('/app/home');
    } catch (error: any) {
      console.error('Withdrawal request error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit withdrawal request',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading balance...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdraw BSK</CardTitle>
        <CardDescription>
          Request to withdraw your BSK to bank account or crypto wallet
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Available Balance:</strong> {balances?.withdrawable_balance || 0} BSK
            <br />
            Withdrawals are processed manually by admin. Please allow 1-3 business days.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="amount">Withdrawal Amount (BSK)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              required
            />
          </div>

          <Tabs value={withdrawalType} onValueChange={(v) => setWithdrawalType(v as 'bank' | 'crypto')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="bank">
                <Banknote className="h-4 w-4 mr-2" />
                Bank Account
              </TabsTrigger>
              <TabsTrigger value="crypto">
                <Bitcoin className="h-4 w-4 mr-2" />
                Crypto
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bank" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g., State Bank of India"
                  required={withdrawalType === 'bank'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountHolderName">Account Holder Name</Label>
                <Input
                  id="accountHolderName"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  placeholder="Full name as per bank"
                  required={withdrawalType === 'bank'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter account number"
                  required={withdrawalType === 'bank'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ifscCode">IFSC Code</Label>
                <Input
                  id="ifscCode"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  placeholder="e.g., SBIN0001234"
                  required={withdrawalType === 'bank'}
                />
              </div>
            </TabsContent>

            <TabsContent value="crypto" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cryptoSymbol">Cryptocurrency</Label>
                <Select value={cryptoSymbol} onValueChange={setCryptoSymbol}>
                  <SelectTrigger id="cryptoSymbol">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                    <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                    <SelectItem value="USDT">Tether (USDT)</SelectItem>
                    <SelectItem value="BNB">Binance Coin (BNB)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cryptoNetwork">Network</Label>
                <Input
                  id="cryptoNetwork"
                  value={cryptoNetwork}
                  onChange={(e) => setCryptoNetwork(e.target.value)}
                  placeholder="e.g., BEP20, ERC20, TRC20"
                  required={withdrawalType === 'crypto'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cryptoAddress">Wallet Address</Label>
                <Input
                  id="cryptoAddress"
                  value={cryptoAddress}
                  onChange={(e) => setCryptoAddress(e.target.value)}
                  placeholder="Enter your wallet address"
                  required={withdrawalType === 'crypto'}
                />
              </div>
            </TabsContent>
          </Tabs>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Withdrawal Request'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
