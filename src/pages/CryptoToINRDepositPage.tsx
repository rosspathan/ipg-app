import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCryptoToINRDeposit, FeeCalculation } from '@/hooks/useCryptoToINRDeposit';

export default function CryptoToINRDepositPage() {
  const navigate = useNavigate();
  const { submitRequest, calculateFees, loading, calculating } = useCryptoToINRDeposit();

  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [userNotes, setUserNotes] = useState('');
  const [calculation, setCalculation] = useState<FeeCalculation | null>(null);

  useEffect(() => {
    fetchAssets();
  }, []);

  useEffect(() => {
    if (selectedAsset && amount && parseFloat(amount) > 0) {
      const timer = setTimeout(() => {
        calculateFees(
          selectedAsset.symbol,
          selectedAsset.id,
          parseFloat(amount),
          selectedAsset.network
        ).then(setCalculation);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setCalculation(null);
    }
  }, [selectedAsset, amount]);

  const fetchAssets = async () => {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('withdraw_enabled', true)
      .neq('network', 'fiat')
      .neq('network', 'FIAT')
      .eq('is_active', true)
      .order('symbol');

    if (error) {
      toast.error('Failed to load assets');
      return;
    }

    setAssets(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAsset || !amount || !txHash) {
      toast.error('Please fill all required fields');
      return;
    }

    let proofUrl = '';

    // Upload proof if provided
    if (proofFile) {
      const fileExt = proofFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `crypto-inr-proofs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('deposits')
        .upload(filePath, proofFile);

      if (uploadError) {
        toast.error('Failed to upload proof');
        return;
      }

      const { data: urlData } = supabase.storage
        .from('deposits')
        .getPublicUrl(filePath);

      proofUrl = urlData.publicUrl;
    }

    try {
      await submitRequest({
        assetSymbol: selectedAsset.symbol,
        assetId: selectedAsset.id,
        amount: parseFloat(amount),
        txHash: txHash.trim(),
        network: selectedAsset.network,
        proofUrl,
        userNotes: userNotes.trim(),
      });

      navigate('/app/funding/my-deposits?tab=crypto-inr');
    } catch (error) {
      // Error already handled in hook
    }
  };

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigate('/app/funding')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div>
        <h1 className="text-3xl font-bold">Crypto to INR Deposit</h1>
        <p className="text-muted-foreground mt-2">
          Submit your crypto deposit for INR credit approval
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="asset">Crypto Asset *</Label>
            <Select
              value={selectedAsset?.id}
              onValueChange={(value) => {
                const asset = assets.find(a => a.id === value);
                setSelectedAsset(asset);
              }}
            >
              <SelectTrigger id="asset">
                <SelectValue placeholder="Select crypto asset" />
              </SelectTrigger>
              <SelectContent>
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.symbol} - {asset.name} ({asset.network})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount Deposited *</Label>
            <Input
              id="amount"
              type="number"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="txHash">Transaction Hash *</Label>
            <Input
              id="txHash"
              type="text"
              placeholder="0x..."
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              The blockchain transaction hash of your deposit
            </p>
          </div>

          {calculation && (
            <Card className="p-4 bg-muted/50 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Info className="w-4 h-4" />
                Deposit Calculation
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Crypto Amount:</span>
                  <span className="font-medium">{calculation.cryptoAmount} {selectedAsset?.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Rate:</span>
                  <span>1 {selectedAsset?.symbol} = ₹{calculation.cryptoUsdRate * calculation.inrUsdRate}</span>
                </div>
                <div className="border-t pt-2 mt-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>₹{calculation.inrSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-destructive">
                  <span>Deposit Fee ({calculation.feePercent}%):</span>
                  <span>-₹{calculation.totalFee.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 mt-2" />
                <div className="flex justify-between font-bold text-base">
                  <span>You will receive:</span>
                  <span className="text-primary">₹{calculation.netInrCredit.toFixed(2)}</span>
                </div>
              </div>
            </Card>
          )}

          <div className="space-y-2">
            <Label htmlFor="proof">Transaction Proof (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="proof"
                type="file"
                accept="image/*"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              />
              <Upload className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              Screenshot of wallet or blockchain explorer (recommended)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes for Admin (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional information..."
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || calculating || !selectedAsset || !amount || !txHash}
          >
            {loading ? 'Submitting...' : calculating ? 'Calculating...' : 'Submit Request'}
          </Button>
        </form>
      </Card>

      <Card className="p-4 bg-warning/10 border-warning">
        <p className="text-sm">
          <strong>Note:</strong> Your deposit will be reviewed by an admin before INR credit is applied.
          Please ensure the transaction hash is correct and matches your deposit.
        </p>
      </Card>
    </div>
  );
}
