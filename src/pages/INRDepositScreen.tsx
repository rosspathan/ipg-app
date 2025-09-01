import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, CreditCard, Smartphone, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface FiatSettings {
  id: string;
  enabled: boolean;
  bank_account_name: string | null;
  bank_account_number: string | null;
  ifsc: string | null;
  bank_name: string | null;
  upi_id: string | null;
  upi_name: string | null;
  notes: string | null;
  min_deposit: number;
  fee_percent: number;
  fee_fixed: number;
}

interface FiatDeposit {
  id: string;
  method: 'BANK' | 'UPI';
  amount: number;
  fee: number;
  net_credit: number;
  reference: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'canceled';
  created_at: string;
}

export default function INRDepositScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [settings, setSettings] = useState<FiatSettings | null>(null);
  const [deposits, setDeposits] = useState<FiatDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [amount, setAmount] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
    
    // Set up realtime listener for settings updates
    const channel = supabase
      .channel('fiat-settings-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'fiat_settings_inr' },
        () => loadData()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'fiat_deposits' },
        () => loadDeposits()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    try {
      // Load settings
      const { data: settingsData } = await supabase
        .from('fiat_settings_inr')
        .select('*')
        .single();

      if (settingsData) {
        setSettings(settingsData);
      }

      await loadDeposits();
    } catch (error) {
      console.error('Error loading INR deposit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDeposits = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('fiat_deposits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setDeposits(data as FiatDeposit[]);
      }
    } catch (error) {
      console.error('Error loading deposits:', error);
    }
  };

  const calculateFees = (depositAmount: number) => {
    if (!settings) return { fee: 0, netCredit: depositAmount };
    
    const percentFee = (depositAmount * settings.fee_percent) / 100;
    const totalFee = percentFee + settings.fee_fixed;
    const netCredit = depositAmount - totalFee;
    
    return { fee: totalFee, netCredit };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select a file smaller than 5MB",
          variant: "destructive"
        });
        return;
      }
      setProofFile(file);
    }
  };

  const uploadProof = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('crypto-logos') // Reusing existing bucket
        .upload(`deposit-proofs/${fileName}`, file);

      if (error) throw error;
      
      return data.path;
    } catch (error) {
      console.error('Error uploading proof:', error);
      return null;
    }
  };

  const handleSubmit = async (method: 'BANK' | 'UPI') => {
    if (!user || !amount || !reference || !proofFile) {
      toast({
        title: "Missing Information",
        description: "Please fill all fields and attach proof",
        variant: "destructive"
      });
      return;
    }

    const depositAmount = parseFloat(amount);
    if (depositAmount < (settings?.min_deposit || 0)) {
      toast({
        title: "Amount Too Low",
        description: `Minimum deposit is ₹${settings?.min_deposit}`,
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      // Upload proof
      const proofUrl = await uploadProof(proofFile);
      if (!proofUrl) {
        throw new Error('Failed to upload proof');
      }

      const { fee, netCredit } = calculateFees(depositAmount);

      // Create deposit record
      const { error } = await supabase
        .from('fiat_deposits')
        .insert({
          user_id: user.id,
          method,
          amount: depositAmount,
          fee,
          net_credit: netCredit,
          reference,
          proof_url: proofUrl
        });

      if (error) throw error;

      toast({
        title: "Deposit Request Submitted",
        description: "Your deposit request has been submitted for review",
      });

      // Reset form
      setAmount('');
      setReference('');
      setProofFile(null);
      
      await loadDeposits();
      
    } catch (error) {
      console.error('Error submitting deposit:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit deposit request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-xl font-semibold">INR Deposits</h1>
            <div className="w-10" />
          </div>
          <div className="text-center py-8">Loading...</div>
        </div>
      </div>
    );
  }

  if (!settings?.enabled) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-xl font-semibold">INR Deposits</h1>
            <div className="w-10" />
          </div>
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              INR deposits are currently unavailable. Please check back later.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const { fee, netCredit } = calculateFees(parseFloat(amount) || 0);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-semibold">INR Deposits</h1>
          <div className="w-10" />
        </div>

        <Tabs defaultValue="deposit" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deposit">New Deposit</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="space-y-4">
            <Tabs defaultValue="bank" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="bank" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Bank Transfer
                </TabsTrigger>
                <TabsTrigger value="upi" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  UPI
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bank">
                <Card>
                  <CardHeader>
                    <CardTitle>Bank Transfer Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Bank Name</Label>
                      <div className="p-3 bg-muted rounded-md">
                        {settings.bank_name}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Account Name</Label>
                      <div className="p-3 bg-muted rounded-md">
                        {settings.bank_account_name}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Account Number</Label>
                      <div className="p-3 bg-muted rounded-md font-mono">
                        {settings.bank_account_number}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>IFSC Code</Label>
                      <div className="p-3 bg-muted rounded-md font-mono">
                        {settings.ifsc}
                      </div>
                    </div>

                    {settings.notes && (
                      <Alert>
                        <AlertDescription>{settings.notes}</AlertDescription>
                      </Alert>
                    )}

                    <DepositForm
                      onSubmit={() => handleSubmit('BANK')}
                      amount={amount}
                      setAmount={setAmount}
                      reference={reference}
                      setReference={setReference}
                      proofFile={proofFile}
                      onFileUpload={handleFileUpload}
                      fee={fee}
                      netCredit={netCredit}
                      minDeposit={settings.min_deposit}
                      submitting={submitting}
                      referenceLabel="UTR Number"
                      referenceHint="Enter the UTR number from your bank transfer"
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="upi">
                <Card>
                  <CardHeader>
                    <CardTitle>UPI Payment Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>UPI ID</Label>
                      <div className="p-3 bg-muted rounded-md font-mono">
                        {settings.upi_id}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Name</Label>
                      <div className="p-3 bg-muted rounded-md">
                        {settings.upi_name}
                      </div>
                    </div>

                    {settings.notes && (
                      <Alert>
                        <AlertDescription>{settings.notes}</AlertDescription>
                      </Alert>
                    )}

                    <DepositForm
                      onSubmit={() => handleSubmit('UPI')}
                      amount={amount}
                      setAmount={setAmount}
                      reference={reference}
                      setReference={setReference}
                      proofFile={proofFile}
                      onFileUpload={handleFileUpload}
                      fee={fee}
                      netCredit={netCredit}
                      minDeposit={settings.min_deposit}
                      submitting={submitting}
                      referenceLabel="Transaction ID"
                      referenceHint="Enter the UPI transaction ID"
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Deposit History</CardTitle>
              </CardHeader>
              <CardContent>
                {deposits.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No deposits yet
                  </p>
                ) : (
                  <div className="space-y-4">
                    {deposits.map((deposit) => (
                      <div key={deposit.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium">₹{deposit.amount.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">
                              {deposit.method} • {new Date(deposit.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <Badge
                            variant={
                              deposit.status === 'approved' ? 'default' :
                              deposit.status === 'rejected' ? 'destructive' :
                              'secondary'
                            }
                          >
                            {deposit.status}
                          </Badge>
                        </div>
                        
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Fee:</span>
                            <span>₹{deposit.fee.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Net Credit:</span>
                            <span>₹{deposit.net_credit.toFixed(2)}</span>
                          </div>
                          {deposit.reference && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Reference:</span>
                              <span className="font-mono text-xs">{deposit.reference}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

interface DepositFormProps {
  onSubmit: () => void;
  amount: string;
  setAmount: (value: string) => void;
  reference: string;
  setReference: (value: string) => void;
  proofFile: File | null;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fee: number;
  netCredit: number;
  minDeposit: number;
  submitting: boolean;
  referenceLabel: string;
  referenceHint: string;
}

function DepositForm({
  onSubmit,
  amount,
  setAmount,
  reference,
  setReference,
  proofFile,
  onFileUpload,
  fee,
  netCredit,
  minDeposit,
  submitting,
  referenceLabel,
  referenceHint
}: DepositFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Amount (INR)</Label>
        <Input
          type="number"
          placeholder={`Minimum ₹${minDeposit}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min={minDeposit}
        />
      </div>

      <div className="space-y-2">
        <Label>{referenceLabel}</Label>
        <Input
          placeholder={referenceHint}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Payment Proof</Label>
        <div className="border-2 border-dashed rounded-lg p-4 text-center">
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={onFileUpload}
            className="hidden"
            id="proof-upload"
          />
          <label htmlFor="proof-upload" className="cursor-pointer">
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {proofFile ? proofFile.name : 'Click to upload screenshot or receipt'}
            </p>
          </label>
        </div>
      </div>

      {parseFloat(amount) > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Amount:</span>
                <span>₹{parseFloat(amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Fee:</span>
                <span>₹{fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>You will receive:</span>
                <span>₹{netCredit.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        className="w-full"
        onClick={onSubmit}
        disabled={!amount || !reference || !proofFile || submitting || parseFloat(amount) < minDeposit}
      >
        {submitting ? 'Submitting...' : 'Submit Deposit Request'}
      </Button>
    </div>
  );
}