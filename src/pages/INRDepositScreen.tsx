import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, Copy, QrCode, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FiatSettings {
  id: string;
  enabled: boolean;
  min_deposit?: number;
  fee_percent?: number;
  fee_fixed?: number;
  created_at: string;
  updated_at: string;
}

interface BankAccount {
  id: string;
  label: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  ifsc: string;
  notes?: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

interface UpiAccount {
  id: string;
  label: string;
  upi_id: string;
  upi_name: string;
  notes?: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

interface FiatDeposit {
  id: string;
  user_id: string;
  method: string;
  route_id?: string;
  amount: number;
  fee: number;
  net_credit: number;
  currency?: string;
  reference?: string;
  proof_url?: string;
  status: string;
  admin_notes?: string;
  created_at: string;
}

interface DepositFormProps {
  method: 'BANK' | 'UPI';
  settings: FiatSettings;
  selectedAccount: BankAccount | UpiAccount | null;
  onSubmit: (data: { amount: number; reference: string; proofFile?: File }) => Promise<void>;
  loading: boolean;
}

const DepositForm = ({ method, settings, selectedAccount, onSubmit, loading }: DepositFormProps) => {
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);

  const calculatedFee = amount ? 
    (parseFloat(amount) * (settings.fee_percent || 0) / 100) + (settings.fee_fixed || 0) : 0;
  const netCredit = amount ? parseFloat(amount) - calculatedFee : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !reference || parseFloat(amount) < (settings.min_deposit || 0) || !selectedAccount) {
      return;
    }
    await onSubmit({ amount: parseFloat(amount), reference, proofFile: proofFile || undefined });
    setAmount('');
    setReference('');
    setProofFile(null);
  };

  const isValid = amount && reference && parseFloat(amount) >= (settings.min_deposit || 0) && selectedAccount && proofFile;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="amount">Amount (INR)</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          placeholder={`Minimum ${settings.min_deposit}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min={settings.min_deposit || 0}
          required
        />
        {amount && parseFloat(amount) < (settings.min_deposit || 0) && (
          <p className="text-sm text-destructive mt-1">
            Amount must be at least ₹{settings.min_deposit?.toLocaleString()}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="reference">{method === 'BANK' ? 'UTR/Reference Number' : 'Transaction ID'}</Label>
        <Input
          id="reference"
          placeholder={method === 'BANK' ? 'Enter UTR number' : 'Enter UPI transaction ID'}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          required
        />
      </div>

      <div>
        <Label>Payment Proof (Required)</Label>
        <div className="mt-2">
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setProofFile(e.target.files?.[0] || null)}
            className="hidden"
            id="proof-upload"
          />
          <label
            htmlFor="proof-upload"
            className="flex items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50"
          >
            {proofFile ? (
              <div className="text-center">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <p className="text-sm">{proofFile.name}</p>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to upload screenshot or receipt</p>
              </div>
            )}
          </label>
        </div>
      </div>

      {amount && selectedAccount && (
        <Card className="bg-muted/50">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between">
              <span>Deposit Amount:</span>
              <span>₹{parseFloat(amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Fee ({settings.fee_percent}% + ₹{settings.fee_fixed}):</span>
              <span>₹{calculatedFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Net Credit:</span>
              <span>₹{netCredit.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Button type="submit" className="w-full" disabled={!isValid || loading}>
        {loading ? 'Processing...' : `Submit ${method} Deposit`}
      </Button>
    </form>
  );
};

const INRDepositScreen = () => {
  const [settings, setSettings] = useState<FiatSettings | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [upiAccounts, setUpiAccounts] = useState<UpiAccount[]>([]);
  const [deposits, setDeposits] = useState<FiatDeposit[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [selectedUpiId, setSelectedUpiId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('new');
  const { toast } = useToast();

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

    const bankChannel = supabase
      .channel('fiat_bank_accounts_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fiat_bank_accounts' },
        () => loadBankAccounts()
      )
      .subscribe();

    const upiChannel = supabase
      .channel('fiat_upi_accounts_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fiat_upi_accounts' },
        () => loadUpiAccounts()
      )
      .subscribe();

    const depositsChannel = supabase
      .channel('fiat_deposits_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fiat_deposits' },
        () => loadDeposits()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(bankChannel);
      supabase.removeChannel(upiChannel);
      supabase.removeChannel(depositsChannel);
    };
  }, []);

  const loadData = async () => {
    await Promise.all([loadSettings(), loadBankAccounts(), loadUpiAccounts(), loadDeposits()]);
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

  const loadBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('fiat_bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setBankAccounts(data || []);
      
      // Auto-select default bank account
      const defaultBank = data?.find(bank => bank.is_default);
      if (defaultBank && !selectedBankId) {
        setSelectedBankId(defaultBank.id);
      }
    } catch (error) {
      console.error('Error loading bank accounts:', error);
    }
  };

  const loadUpiAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('fiat_upi_accounts')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setUpiAccounts(data || []);
      
      // Auto-select default UPI account
      const defaultUpi = data?.find(upi => upi.is_default);
      if (defaultUpi && !selectedUpiId) {
        setSelectedUpiId(defaultUpi.id);
      }
    } catch (error) {
      console.error('Error loading UPI accounts:', error);
    }
  };

  const loadDeposits = async () => {
    try {
      const { data, error } = await supabase
        .from('fiat_deposits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeposits(data || []);
    } catch (error) {
      console.error('Error loading deposits:', error);
    }
  };

  const uploadProof = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `deposit-proofs/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('support')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('support')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleDeposit = async (method: 'BANK' | 'UPI', depositData: { amount: number; reference: string; proofFile?: File }) => {
    if (!settings) return;
    
    const routeId = method === 'BANK' ? selectedBankId : selectedUpiId;
    if (!routeId) {
      toast({
        title: "Error",
        description: `Please select a ${method === 'BANK' ? 'bank account' : 'UPI account'}`,
        variant: "destructive",
      });
      return;
    }
    
    setSubmitting(true);
    try {
      let proofUrl = '';
      if (depositData.proofFile) {
        proofUrl = await uploadProof(depositData.proofFile);
      }

      const fee = (depositData.amount * (settings.fee_percent || 0) / 100) + (settings.fee_fixed || 0);
      const netCredit = depositData.amount - fee;

      const { error } = await supabase
        .from('fiat_deposits')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          method,
          route_id: routeId,
          amount: depositData.amount,
          fee,
          net_credit: netCredit,
          reference: depositData.reference,
          proof_url: proofUrl,
        });

      if (error) throw error;

      toast({
        title: "Deposit Submitted",
        description: "Your INR deposit request has been submitted for review",
      });

      setActiveTab('history');
    } catch (error) {
      console.error('Error submitting deposit:', error);
      toast({
        title: "Error",
        description: "Failed to submit deposit request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
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

  if (!settings?.enabled) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">INR Deposits</h1>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            INR deposits are currently unavailable. Please contact support for more information.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const selectedBank = bankAccounts.find(bank => bank.id === selectedBankId);
  const selectedUpi = upiAccounts.find(upi => upi.id === selectedUpiId);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">INR Deposits</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="new">New Deposit</TabsTrigger>
          <TabsTrigger value="history">History ({deposits.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-6">
          <Tabs defaultValue="bank" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="bank">Bank Transfer</TabsTrigger>
              <TabsTrigger value="upi">UPI</TabsTrigger>
            </TabsList>

            <TabsContent value="bank" className="space-y-4">
              {bankAccounts.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No bank accounts are currently available for deposits.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Select Bank Account</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose bank account" />
                        </SelectTrigger>
                        <SelectContent>
                          {bankAccounts.map((bank) => (
                            <SelectItem key={bank.id} value={bank.id}>
                              {bank.label} - {bank.bank_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>

                  {selectedBank && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Bank Transfer Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <Label className="font-semibold">Bank Name:</Label>
                            <div className="flex items-center gap-2">
                              <p>{selectedBank.bank_name}</p>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(selectedBank.bank_name)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label className="font-semibold">Account Name:</Label>
                            <div className="flex items-center gap-2">
                              <p>{selectedBank.account_name}</p>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(selectedBank.account_name)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label className="font-semibold">Account Number:</Label>
                            <div className="flex items-center gap-2">
                              <p className="font-mono">{selectedBank.account_number}</p>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(selectedBank.account_number)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label className="font-semibold">IFSC Code:</Label>
                            <div className="flex items-center gap-2">
                              <p className="font-mono">{selectedBank.ifsc}</p>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(selectedBank.ifsc)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="border-t pt-3">
                          <p className="text-sm text-muted-foreground">
                            Min Deposit: ₹{settings.min_deposit?.toLocaleString()} | Fee: {settings.fee_percent}% + ₹{settings.fee_fixed}
                          </p>
                          {selectedBank.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{selectedBank.notes}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle>Submit Bank Deposit</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DepositForm
                        method="BANK"
                        settings={settings}
                        selectedAccount={selectedBank || null}
                        onSubmit={(data) => handleDeposit('BANK', data)}
                        loading={submitting}
                      />
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="upi" className="space-y-4">
              {upiAccounts.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No UPI accounts are currently available for deposits.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Select UPI Account</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Select value={selectedUpiId} onValueChange={setSelectedUpiId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose UPI account" />
                        </SelectTrigger>
                        <SelectContent>
                          {upiAccounts.map((upi) => (
                            <SelectItem key={upi.id} value={upi.id}>
                              {upi.label} - {upi.upi_id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>

                  {selectedUpi && (
                    <Card>
                      <CardHeader>
                        <CardTitle>UPI Payment Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-center space-y-2">
                          <div>
                            <Label className="font-semibold">UPI ID:</Label>
                            <div className="flex items-center justify-center gap-2">
                              <p className="font-mono text-lg">{selectedUpi.upi_id}</p>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(selectedUpi.upi_id)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label className="font-semibold">Name:</Label>
                            <p>{selectedUpi.upi_name}</p>
                          </div>
                        </div>
                        <div className="border-t pt-3 text-center">
                          <p className="text-sm text-muted-foreground">
                            Min Deposit: ₹{settings.min_deposit?.toLocaleString()} | Fee: {settings.fee_percent}% + ₹{settings.fee_fixed}
                          </p>
                          {selectedUpi.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{selectedUpi.notes}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle>Submit UPI Deposit</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DepositForm
                        method="UPI"
                        settings={settings}
                        selectedAccount={selectedUpi || null}
                        onSubmit={(data) => handleDeposit('UPI', data)}
                        loading={submitting}
                      />
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>My INR Deposits</CardTitle>
            </CardHeader>
            <CardContent>
              {deposits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No deposits yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Net Credit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deposits.map((deposit) => (
                      <TableRow key={deposit.id}>
                        <TableCell>
                          {new Date(deposit.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{deposit.method}</Badge>
                        </TableCell>
                        <TableCell>₹{deposit.amount.toLocaleString()}</TableCell>
                        <TableCell>₹{deposit.fee.toLocaleString()}</TableCell>
                        <TableCell>₹{deposit.net_credit.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(deposit.status)}>
                            {deposit.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {deposit.reference}
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

export default INRDepositScreen;