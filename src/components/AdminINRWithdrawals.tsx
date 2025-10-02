import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

const AdminINRWithdrawals = () => {
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
      setLoading(true);
      const { data, error } = await supabase
        .from('fiat_withdrawals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
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

      await supabase.rpc('log_admin_action', {
        p_action: `fiat_withdrawal_${action}`,
        p_resource_type: 'fiat_withdrawal',
        p_resource_id: withdrawalId,
        p_new_values: updateData,
      });

      toast({
        title: "Success",
        description: `INR withdrawal ${action} successfully`,
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
      approved: "bg-green-500/10 text-green-700 border-green-500/20",
      rejected: "bg-red-500/10 text-red-700 border-red-500/20",
      completed: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    };

    return (
      <Badge className={variants[status] || variants.pending}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return <div className="p-4 text-center">Loading withdrawals...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg md:text-xl">INR Withdrawal Requests</CardTitle>
          <Button size="sm" variant="outline" onClick={loadFiatWithdrawals}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="min-w-[150px]">Bank Details</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fiatWithdrawals.map((withdrawal) => (
                <TableRow key={withdrawal.id}>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium truncate">{withdrawal.profiles?.full_name || 'N/A'}</div>
                      <div className="text-muted-foreground text-xs truncate">{withdrawal.profiles?.email || 'N/A'}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium whitespace-nowrap">
                      ₹{withdrawal.amount.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <div className="truncate">{withdrawal.bank_details?.bank_name || 'N/A'}</div>
                      <div className="text-muted-foreground truncate">{withdrawal.bank_details?.account_number || 'N/A'}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(withdrawal.status)}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
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
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Review INR Withdrawal</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>User</Label>
                              <p className="text-sm">{withdrawal.profiles?.full_name} ({withdrawal.profiles?.email})</p>
                            </div>
                            <div>
                              <Label>Amount</Label>
                              <p className="text-sm font-medium">₹{withdrawal.amount.toLocaleString()}</p>
                            </div>
                            <div>
                              <Label>Bank Details</Label>
                              <div className="text-sm bg-muted p-3 rounded space-y-1">
                                <div><span className="font-medium">Bank:</span> {withdrawal.bank_details?.bank_name}</div>
                                <div><span className="font-medium">Account:</span> {withdrawal.bank_details?.account_number}</div>
                                <div><span className="font-medium">IFSC:</span> {withdrawal.bank_details?.ifsc}</div>
                              </div>
                            </div>
                            <div>
                              <Label>Admin Notes</Label>
                              <Textarea
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                placeholder="Add notes..."
                                rows={3}
                              />
                            </div>
                            <div>
                              <Label>Reference ID</Label>
                              <Input
                                value={referenceId}
                                onChange={(e) => setReferenceId(e.target.value)}
                                placeholder="Transaction reference"
                              />
                            </div>
                            <div>
                              <Label>Proof URL</Label>
                              <Input
                                value={proofUrl}
                                onChange={(e) => setProofUrl(e.target.value)}
                                placeholder="Payment proof URL"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
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
                  </TableCell>
                </TableRow>
              ))}
              {fiatWithdrawals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No withdrawal requests found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminINRWithdrawals;
