import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Eye, Loader2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ApprovalQueueProps {
  onApprove?: () => void;
}

interface PendingItem {
  id: string;
  user_id: string;
  amount: number;
  created_at: string;
  type: 'deposit' | 'withdrawal';
  method?: string;
  reference?: string;
  proof_url?: string;
  admin_notes?: string;
  profiles?: {
    email: string;
    full_name: string;
  } | null;
}

const ApprovalQueue = ({ onApprove }: ApprovalQueueProps) => {
  const [loading, setLoading] = useState(true);
  const [deposits, setDeposits] = useState<PendingItem[]>([]);
  const [withdrawals, setWithdrawals] = useState<PendingItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPendingItems();
  }, []);

  const loadPendingItems = async () => {
    try {
      setLoading(true);

      // Load pending deposits
      const { data: depositData, error: depositError } = await supabase
        .from('fiat_deposits')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (depositError) throw depositError;

      // Load pending withdrawals
      const { data: withdrawalData, error: withdrawalError } = await supabase
        .from('fiat_withdrawals')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (withdrawalError) throw withdrawalError;

      // Fetch profiles for deposits
      const depositsWithProfiles = await Promise.all(
        (depositData || []).map(async (item) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', item.user_id)
            .maybeSingle();
          
          return {
            ...item,
            type: 'deposit' as const,
            profiles: profile,
          };
        })
      );

      // Fetch profiles for withdrawals
      const withdrawalsWithProfiles = await Promise.all(
        (withdrawalData || []).map(async (item) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', item.user_id)
            .maybeSingle();
          
          return {
            ...item,
            type: 'withdrawal' as const,
            profiles: profile,
          };
        })
      );

      setDeposits(depositsWithProfiles);
      setWithdrawals(withdrawalsWithProfiles);
    } catch (error) {
      console.error('Error loading pending items:', error);
      toast({
        title: "Error",
        description: "Failed to load pending transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!selectedItem) return;

    try {
      setProcessing(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const table = selectedItem.type === 'deposit' ? 'fiat_deposits' : 'fiat_withdrawals';
      
      const { error } = await supabase
        .from(table)
        .update({
          status,
          decided_at: new Date().toISOString(),
          decided_by: user.id,
          admin_notes: reviewNotes || null,
        })
        .eq('id', selectedItem.id);

      if (error) throw error;

      // If approved deposit, update INR balance
      if (status === 'approved' && selectedItem.type === 'deposit') {
        // First try to get existing balance
        const { data: existingBalance } = await supabase
          .from('user_inr_balances')
          .select('balance, total_deposited')
          .eq('user_id', selectedItem.user_id)
          .maybeSingle();

        if (existingBalance) {
          // Update existing balance
          const { error: balanceError } = await supabase
            .from('user_inr_balances')
            .update({
              balance: Number(existingBalance.balance) + Number(selectedItem.amount),
              total_deposited: Number(existingBalance.total_deposited) + Number(selectedItem.amount),
            })
            .eq('user_id', selectedItem.user_id);

          if (balanceError) console.error('Balance update error:', balanceError);
        } else {
          // Create new balance
          const { error: balanceError } = await supabase
            .from('user_inr_balances')
            .insert({
              user_id: selectedItem.user_id,
              balance: selectedItem.amount,
              total_deposited: selectedItem.amount,
            });

          if (balanceError) console.error('Balance creation error:', balanceError);
        }
      }

      toast({
        title: status === 'approved' ? "Approved" : "Rejected",
        description: `Transaction ${status} successfully`,
      });

      setSelectedItem(null);
      setReviewNotes("");
      loadPendingItems();
      if (onApprove) onApprove();
    } catch (error) {
      console.error('Error reviewing transaction:', error);
      toast({
        title: "Error",
        description: `Failed to ${status} transaction`,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const renderTable = (items: PendingItem[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <div className="text-sm">
                <div className="font-medium">{item.profiles?.full_name || 'N/A'}</div>
                <div className="text-muted-foreground text-xs">{item.profiles?.email || 'N/A'}</div>
              </div>
            </TableCell>
            <TableCell className="font-medium">
              ₹{Number(item.amount).toLocaleString('en-IN')}
            </TableCell>
            <TableCell>
              <Badge variant="outline">{item.method || 'N/A'}</Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {item.reference || 'N/A'}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {new Date(item.created_at).toLocaleDateString('en-IN')}
            </TableCell>
            <TableCell>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedItem(item)}
              >
                <Eye className="w-4 h-4 mr-2" />
                Review
              </Button>
            </TableCell>
          </TableRow>
        ))}
        {items.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
              No pending {items === deposits ? 'deposits' : 'withdrawals'}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="deposits">
            <TabsList>
              <TabsTrigger value="deposits">
                Deposits ({deposits.length})
              </TabsTrigger>
              <TabsTrigger value="withdrawals">
                Withdrawals ({withdrawals.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="deposits" className="mt-4">
              {renderTable(deposits)}
            </TabsContent>
            
            <TabsContent value="withdrawals" className="mt-4">
              {renderTable(withdrawals)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Review {selectedItem?.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>User</Label>
                  <p className="text-sm">{selectedItem.profiles?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedItem.profiles?.email}</p>
                </div>
                <div>
                  <Label>Amount</Label>
                  <p className="text-lg font-bold">₹{Number(selectedItem.amount).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <Label>Method</Label>
                  <p className="text-sm">{selectedItem.method || 'N/A'}</p>
                </div>
                <div>
                  <Label>Reference</Label>
                  <p className="text-sm">{selectedItem.reference || 'N/A'}</p>
                </div>
                <div>
                  <Label>Date</Label>
                  <p className="text-sm">
                    {new Date(selectedItem.created_at).toLocaleString('en-IN')}
                  </p>
                </div>
                {selectedItem.proof_url && (
                  <div>
                    <Label>Proof of Payment</Label>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto"
                      onClick={() => window.open(selectedItem.proof_url, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View Proof
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <Label>Admin Notes (optional)</Label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add any notes about this decision..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleReview('rejected')}
                  disabled={processing}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleReview('approved')}
                  disabled={processing}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {processing ? "Processing..." : "Approve"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ApprovalQueue;
