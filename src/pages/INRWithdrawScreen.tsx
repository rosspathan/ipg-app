import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, AlertCircle, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSecurity } from "@/hooks/useSecurity";
import { useKYC } from "@/hooks/useKYC";

interface FiatSettings {
  id: string;
  enabled: boolean;
  bank_account_name?: string;
  bank_account_number?: string;
  ifsc?: string;
  bank_name?: string;
  upi_id?: string;
  upi_name?: string;
  notes?: string;
  min_deposit?: number;
  min_withdraw?: number;
  fee_percent?: number;
  fee_fixed?: number;
  withdraw_fee_percent?: number;
  withdraw_fee_fixed?: number;
  processing_hours?: string;
  created_at: string;
  updated_at: string;
}

interface FiatWithdrawal {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  bank_details: any;
  status: string;
  admin_notes?: string;
  processed_by?: string;
  processed_at?: string;
  reference_id?: string;
  proof_url?: string;
  created_at: string;
}

interface BankingDetails {
  account_name?: string;
  account_number?: string;
  ifsc?: string;
  bank_name?: string;
  upi_id?: string;
  upi_name?: string;
}

const INRWithdrawScreen = () => {
  const [settings, setSettings] = useState<FiatSettings | null>(null);
  const [withdrawals, setWithdrawals] = useState<FiatWithdrawal[]>([]);
  const [bankingDetails, setBankingDetails] = useState<BankingDetails>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('new');
  
  // Form states
  const [selectedMethod, setSelectedMethod] = useState<'BANK' | 'UPI'>('BANK');
  const [amount, setAmount] = useState('');
  const [useExisting, setUseExisting] = useState(true);
  const [newBankDetails, setNewBankDetails] = useState<BankingDetails>({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const { toast } = useToast();
  const { security } = useSecurity();
  const { kycProfile } = useKYC();

  useEffect(() => {
    loadData();
    
    // Set up realtime listeners
    const settingsChannel = supabase
      .channel('fiat_settings_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fiat_settings_inr' },
        () => loadSettings()
      )
      .subscribe();

    const withdrawalsChannel = supabase
      .channel('fiat_withdrawals_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fiat_withdrawals' },
        () => loadWithdrawals()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(withdrawalsChannel);
    };
  }, []);

  const loadData = async () => {
    await Promise.all([loadSettings(), loadWithdrawals(), loadBankingDetails()]);
    setLoading(false);
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('fiat_settings_inr')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from('fiat_withdrawals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error) {
      console.error('Error loading withdrawals:', error);
    }
  };

  const loadBankingDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('banking_inr')
        .select('*')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setBankingDetails(data || {});
    } catch (error) {
      console.error('Error loading banking details:', error);
    }
  };

  const calculateFee = (amount: number): number => {
    return 0; // Simplified for demo - would use settings.withdraw_fee_percent + withdraw_fee_fixed
  };

  const isEligibleToWithdraw = (): { eligible: boolean; reason?: string } => {
    if (kycProfile?.status !== 'verified') {
      return { eligible: false, reason: 'KYC verification required' };
    }
    
    if (security?.withdraw_whitelist_only && !bankingDetails.account_number && !bankingDetails.upi_id) {
      return { eligible: false, reason: 'Banking details must be verified in profile' };
    }
    
    return { eligible: true };
  };

  const handleWithdraw = async () => {
    if (!settings || !amount) return;
    
    setSubmitting(true);
    try {
      const withdrawAmount = parseFloat(amount);
      const fee = calculateFee(withdrawAmount);
      const netPayout = withdrawAmount - fee;
      
      const beneficiaryData = useExisting ? 
        (selectedMethod === 'BANK' ? 
          {
            account_name: bankingDetails.account_name,
            account_number: bankingDetails.account_number,
            ifsc: bankingDetails.ifsc,
            bank_name: bankingDetails.bank_name
          } : 
          {
            upi_id: bankingDetails.upi_id,
            upi_name: bankingDetails.upi_name
          }
        ) : newBankDetails;

      const { error } = await supabase
        .from('fiat_withdrawals')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          amount: withdrawAmount,
          currency: 'INR',
          bank_details: beneficiaryData as any,
        });

      if (error) throw error;

      toast({
        title: "Withdrawal Submitted",
        description: "Your INR withdrawal request has been submitted for processing",
      });

      // Reset form
      setAmount('');
      setNewBankDetails({});
      setShowConfirmation(false);
      setActiveTab('history');
    } catch (error) {
      console.error('Error submitting withdrawal:', error);
      toast({
        title: "Error",
        description: "Failed to submit withdrawal request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      processing: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      canceled: "bg-gray-100 text-gray-800"
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const eligibility = isEligibleToWithdraw();
  
  if (!eligibility.eligible) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">INR Withdrawals</h1>
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            {eligibility.reason}. Please complete verification to enable withdrawals.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const fee = amount ? calculateFee(parseFloat(amount)) : 0;
  const netPayout = amount ? parseFloat(amount) - fee : 0;
  const isValidAmount = amount && parseFloat(amount) >= (settings?.min_withdraw || 0);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">INR Withdrawals</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="new">New Withdrawal</TabsTrigger>
          <TabsTrigger value="history">History ({withdrawals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedMethod} onValueChange={(value: 'BANK' | 'UPI') => setSelectedMethod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK">Bank Transfer</SelectItem>
                  <SelectItem value="UPI">UPI Transfer</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Beneficiary Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {((selectedMethod === 'BANK' && bankingDetails.account_number) || 
                (selectedMethod === 'UPI' && bankingDetails.upi_id)) && (
                <div className="space-y-3">
                  <Label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={useExisting}
                      onChange={() => setUseExisting(true)}
                    />
                    <span>Use saved details</span>
                  </Label>
                  <div className="ml-6 p-3 bg-muted rounded-lg text-sm">
                    {selectedMethod === 'BANK' ? (
                      <div>
                        <p><strong>Bank:</strong> {bankingDetails.bank_name}</p>
                        <p><strong>Account:</strong> {bankingDetails.account_name}</p>
                        <p><strong>Number:</strong> {bankingDetails.account_number}</p>
                        <p><strong>IFSC:</strong> {bankingDetails.ifsc}</p>
                      </div>
                    ) : (
                      <div>
                        <p><strong>UPI ID:</strong> {bankingDetails.upi_id}</p>
                        <p><strong>Name:</strong> {bankingDetails.upi_name}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={!useExisting}
                    onChange={() => setUseExisting(false)}
                  />
                  <span>Enter new details</span>
                </Label>
                
                {!useExisting && (
                  <div className="ml-6 space-y-3">
                    {selectedMethod === 'BANK' ? (
                      <>
                        <Input
                          placeholder="Account Holder Name"
                          value={newBankDetails.account_name || ''}
                          onChange={(e) => setNewBankDetails({...newBankDetails, account_name: e.target.value})}
                        />
                        <Input
                          placeholder="Account Number"
                          value={newBankDetails.account_number || ''}
                          onChange={(e) => setNewBankDetails({...newBankDetails, account_number: e.target.value})}
                        />
                        <Input
                          placeholder="IFSC Code"
                          value={newBankDetails.ifsc || ''}
                          onChange={(e) => setNewBankDetails({...newBankDetails, ifsc: e.target.value})}
                        />
                        <Input
                          placeholder="Bank Name"
                          value={newBankDetails.bank_name || ''}
                          onChange={(e) => setNewBankDetails({...newBankDetails, bank_name: e.target.value})}
                        />
                      </>
                    ) : (
                      <>
                        <Input
                          placeholder="UPI ID"
                          value={newBankDetails.upi_id || ''}
                          onChange={(e) => setNewBankDetails({...newBankDetails, upi_id: e.target.value})}
                        />
                        <Input
                          placeholder="Account Holder Name"
                          value={newBankDetails.upi_name || ''}
                          onChange={(e) => setNewBankDetails({...newBankDetails, upi_name: e.target.value})}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Withdrawal Amount</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="amount">Amount (INR)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder={`Minimum ${settings?.min_withdraw}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={settings?.min_withdraw}
                />
                {amount && !isValidAmount && (
                  <p className="text-sm text-destructive mt-1">
                    Amount must be at least ₹{settings?.min_withdraw?.toLocaleString()}
                  </p>
                )}
              </div>

              {amount && isValidAmount && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Withdrawal Amount:</span>
                      <span>₹{parseFloat(amount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fee ({settings?.withdraw_fee_percent}% + ₹{settings?.withdraw_fee_fixed}):</span>
                      <span>₹{fee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Net Payout:</span>
                      <span>₹{netPayout.toLocaleString()}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Processing Time: {settings?.processing_hours}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
                <DialogTrigger asChild>
                  <Button 
                    className="w-full" 
                    disabled={!isValidAmount || submitting}
                    onClick={() => setShowConfirmation(true)}
                  >
                    Continue to Confirm
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Confirm Withdrawal
                    </DialogTitle>
                    <DialogDescription>
                      Please review and confirm your withdrawal details
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span>Method:</span>
                        <span>{selectedMethod}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Amount:</span>
                        <span>₹{parseFloat(amount).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fee:</span>
                        <span>₹{fee.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Net Payout:</span>
                        <span>₹{netPayout.toLocaleString()}</span>
                      </div>
                    </div>
                    <Button
                      onClick={handleWithdraw}
                      disabled={submitting}
                      className="w-full"
                    >
                      {submitting ? 'Processing...' : 'Confirm with PIN/Biometric'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>My INR Withdrawals</CardTitle>
            </CardHeader>
            <CardContent>
              {withdrawals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No withdrawals yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Net Payout</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payout Ref</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map((withdrawal) => (
                      <TableRow key={withdrawal.id}>
                        <TableCell>
                          {new Date(withdrawal.created_at).toLocaleDateString()}
                        </TableCell>
                       <TableCell>
                          <Badge variant="outline">
                            {withdrawal.bank_details?.upi_id ? 'UPI' : 'BANK'}
                          </Badge>
                        </TableCell>
                        <TableCell>₹{withdrawal.amount.toLocaleString()}</TableCell>
                        <TableCell>₹{(withdrawal.amount * 0.01).toLocaleString()}</TableCell>
                        <TableCell>₹{(withdrawal.amount * 0.99).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(withdrawal.status)}>
                            {withdrawal.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {withdrawal.reference_id || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default INRWithdrawScreen;