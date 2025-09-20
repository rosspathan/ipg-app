import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Download, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminINRAccounts from "@/components/AdminINRAccounts";
import AdminINRDeposits from "@/components/AdminINRDeposits";

interface FiatWithdrawal {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  bank_details: any;
  status: string;
  admin_notes: string;
  reference_id: string;
  proof_url: string;
  created_at: string;
  profiles?: {
    email: string;
    full_name: string;
  } | null;
}

const AdminFunding = () => {
  const [fiatWithdrawals, setFiatWithdrawals] = useState<FiatWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<FiatWithdrawal | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadFiatWithdrawals();
  }, []);

  const loadFiatWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from('fiat_withdrawals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get user emails separately since profiles table may not have the right relationship
      const withdrawalsWithProfiles = await Promise.all(
        (data || []).map(async (withdrawal) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', withdrawal.user_id)
            .maybeSingle();
          
          return {
            ...withdrawal,
            profiles: profile
          };
        })
      );
      
      setFiatWithdrawals(withdrawalsWithProfiles);
    } catch (error) {
      console.error('Error loading fiat withdrawals:', error);
      toast({
        title: "Error",
        description: "Failed to load fiat withdrawals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawalAction = async (withdrawalId: string, action: 'approved' | 'rejected') => {
    try {
      const updateData: any = {
        status: action,
        processed_at: new Date().toISOString(),
        processed_by: (await supabase.auth.getUser()).data.user?.id,
      };

      if (adminNotes) updateData.admin_notes = adminNotes;
      if (referenceId) updateData.reference_id = referenceId;
      if (proofUrl) updateData.proof_url = proofUrl;

      const { error } = await supabase
        .from('fiat_withdrawals')
        .update(updateData)
        .eq('id', withdrawalId);

      if (error) throw error;

      // Log admin action
      await supabase.rpc('log_admin_action', {
        p_action: `fiat_withdrawal_${action}`,
        p_resource_type: 'fiat_withdrawal',
        p_resource_id: withdrawalId,
        p_new_values: updateData,
      });

      toast({
        title: "Success",
        description: `Fiat withdrawal ${action} successfully`,
      });

      setSelectedWithdrawal(null);
      setAdminNotes('');
      setReferenceId('');
      setProofUrl('');
      loadFiatWithdrawals();
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      toast({
        title: "Error",
        description: "Failed to process withdrawal",
        variant: "destructive",
      });
    }
  };

  const exportToCsv = () => {
    const csvData = fiatWithdrawals.map(w => ({
      ID: w.id,
      User: w.profiles?.email || 'N/A',
      Amount: w.amount,
      Currency: w.currency,
      Status: w.status,
      Date: new Date(w.created_at).toLocaleDateString(),
      Reference: w.reference_id || 'N/A',
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fiat_withdrawals.csv';
    a.click();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: "secondary", className: "bg-yellow-100 text-yellow-800" },
      approved: { variant: "default", className: "bg-green-100 text-green-800" },
      rejected: { variant: "destructive", className: "bg-red-100 text-red-800" },
      completed: { variant: "default", className: "bg-blue-100 text-blue-800" },
    };

    const config = variants[status] || variants.pending;
    return (
      <Badge variant={config.variant} className={config.className}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return <div className="p-6">Loading funding operations...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Funding Operations</h1>
        <Button onClick={exportToCsv} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Tabs defaultValue="crypto" className="w-full">
        <TabsList className="w-full flex gap-2 overflow-x-auto scrollbar-hide">
          <TabsTrigger className="shrink-0" value="crypto">Crypto Deposits/Withdrawals</TabsTrigger>
          <TabsTrigger className="shrink-0" value="inr-accounts">INR Accounts</TabsTrigger>
          <TabsTrigger className="shrink-0" value="inr-deposits">INR Deposits</TabsTrigger>
          <TabsTrigger className="shrink-0" value="inr-withdrawals">INR Withdrawals</TabsTrigger>
          <TabsTrigger className="shrink-0" value="reconciliation">Daily Reconciliation</TabsTrigger>
        </TabsList>

        <TabsContent value="crypto">
          <Card>
            <CardHeader>
              <CardTitle>Crypto Funding Monitor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Crypto deposits and withdrawals monitoring would be integrated with blockchain APIs.</p>
                <p>This would show real-time transaction monitoring with TX IDs and confirmations.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inr-accounts">
          <AdminINRAccounts />
        </TabsContent>

        <TabsContent value="inr-deposits">
          <AdminINRDeposits />
        </TabsContent>

        <TabsContent value="inr-withdrawals">
          <Card>
            <CardHeader>
              <CardTitle>INR Withdrawal Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Bank Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fiatWithdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{withdrawal.profiles?.full_name || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">{withdrawal.profiles?.email || 'N/A'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {withdrawal.amount.toLocaleString()} {withdrawal.currency}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Bank: {withdrawal.bank_details?.bank_name || 'N/A'}</div>
                          <div>Account: {withdrawal.bank_details?.account_number || 'N/A'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(withdrawal.status)}
                      </TableCell>
                      <TableCell>
                        {new Date(withdrawal.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {withdrawal.status === 'pending' && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setSelectedWithdrawal(withdrawal)}
                              >
                                Review
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Review Fiat Withdrawal</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>User</Label>
                                  <p>{withdrawal.profiles?.full_name} ({withdrawal.profiles?.email})</p>
                                </div>
                                <div>
                                  <Label>Amount</Label>
                                  <p>{withdrawal.amount.toLocaleString()} {withdrawal.currency}</p>
                                </div>
                                <div>
                                  <Label>Bank Details</Label>
                                  <pre className="text-sm bg-muted p-2 rounded">
                                    {JSON.stringify(withdrawal.bank_details, null, 2)}
                                  </pre>
                                </div>
                                <div>
                                  <Label>Admin Notes</Label>
                                  <Textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="Add notes about this withdrawal..."
                                  />
                                </div>
                                <div>
                                  <Label>Reference ID</Label>
                                  <Input
                                    value={referenceId}
                                    onChange={(e) => setReferenceId(e.target.value)}
                                    placeholder="Bank reference ID or transaction number"
                                  />
                                </div>
                                <div>
                                  <Label>Proof URL</Label>
                                  <Input
                                    value={proofUrl}
                                    onChange={(e) => setProofUrl(e.target.value)}
                                    placeholder="URL to payment proof or receipt"
                                  />
                                </div>
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => handleWithdrawalAction(withdrawal.id, 'rejected')}
                                  >
                                    <X className="mr-2 h-4 w-4" />
                                    Reject
                                  </Button>
                                  <Button
                                    onClick={() => handleWithdrawalAction(withdrawal.id, 'approved')}
                                  >
                                    <Check className="mr-2 h-4 w-4" />
                                    Approve
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        {withdrawal.reference_id && (
                          <div className="text-xs text-muted-foreground">
                            Ref: {withdrawal.reference_id}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliation">
          <Card>
            <CardHeader>
              <CardTitle>Daily Reconciliation Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Daily reconciliation reports would show:</p>
                <ul className="list-disc list-inside mt-4 space-y-2">
                  <li>Total deposits vs withdrawals by asset</li>
                  <li>Platform fee collection</li>
                  <li>Hot/cold wallet balances</li>
                  <li>Pending transactions</li>
                  <li>Discrepancies and alerts</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminFunding;