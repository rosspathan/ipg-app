import { useState, useEffect } from 'react';
import { Check, X, Eye, Search, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { TransactionPreviewModal } from '@/components/admin/TransactionPreviewModal';

interface FiatDeposit {
  id: string;
  user_id: string;
  method: 'BANK' | 'UPI';
  amount: number;
  fee: number;
  net_credit: number;
  reference: string | null;
  proof_url: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'canceled';
  admin_notes: string | null;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
}

export default function AdminINRDeposits() {
  const [deposits, setDeposits] = useState<FiatDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeposit, setSelectedDeposit] = useState<FiatDeposit | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  useEffect(() => {
    loadDeposits();
    
    // Set up realtime listener
    const channel = supabase
      .channel('fiat-deposits-admin')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'fiat_deposits' },
        () => loadDeposits()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadDeposits = async () => {
    try {
      const { data, error } = await supabase
        .from('fiat_deposits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        setDeposits(data as FiatDeposit[]);
      }
    } catch (error) {
      console.error('Error loading deposits:', error);
      toast({
        title: "Error",
        description: "Failed to load INR deposits",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (deposit: FiatDeposit) => {
    setProcessing(true);
    
    try {
      // Calculate final fee and net credit
      const { data: settings } = await supabase
        .from('fiat_settings_inr')
        .select('fee_percent, fee_fixed')
        .single();

      const feePercent = settings?.fee_percent || 0;
      const feeFixed = settings?.fee_fixed || 0;
      const totalFee = (deposit.amount * feePercent / 100) + feeFixed;
      const netCredit = deposit.amount - totalFee;

      const user = await supabase.auth.getUser();

      // Update deposit status
      const { error } = await supabase
        .from('fiat_deposits')
        .update({
          status: 'approved',
          fee: totalFee,
          net_credit: netCredit,
          admin_notes: adminNotes,
          decided_at: new Date().toISOString(),
          decided_by: user.data.user?.id
        })
        .eq('id', deposit.id);

      if (error) throw error;

      // Create audit log
      await supabase.from('audit_logs').insert({
        user_id: user.data.user?.id,
        action: 'fiat_deposit_approved',
        resource_type: 'fiat_deposits',
        resource_id: deposit.id,
        new_values: { status: 'approved', net_credit: netCredit, fee: totalFee }
      });

      toast({
        title: "Deposit Approved",
        description: `Deposit of ₹${deposit.amount} has been approved`,
      });

      setSelectedDeposit(null);
      setAdminNotes('');
      setPreviewModalOpen(false);
    } catch (error) {
      console.error('Error approving deposit:', error);
      toast({
        title: "Approval Failed",
        description: "Failed to approve deposit",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (deposit: FiatDeposit) => {
    if (!adminNotes.trim()) {
      toast({
        title: "Notes Required",
        description: "Please provide a reason for rejection",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);

    try {
      const user = await supabase.auth.getUser();

      const { error } = await supabase
        .from('fiat_deposits')
        .update({
          status: 'rejected',
          admin_notes: adminNotes,
          decided_at: new Date().toISOString(),
          decided_by: user.data.user?.id
        })
        .eq('id', deposit.id);

      if (error) throw error;

      // Create audit log
      await supabase.from('audit_logs').insert({
        user_id: user.data.user?.id,
        action: 'fiat_deposit_rejected',
        resource_type: 'fiat_deposits',
        resource_id: deposit.id,
        new_values: { status: 'rejected', admin_notes: adminNotes }
      });

      toast({
        title: "Deposit Rejected",
        description: "Deposit has been rejected",
      });

      setSelectedDeposit(null);
      setAdminNotes('');
      setPreviewModalOpen(false);
    } catch (error) {
      console.error('Error rejecting deposit:', error);
      toast({
        title: "Rejection Failed",
        description: "Failed to reject deposit",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const filteredDeposits = deposits.filter(deposit => {
    const matchesStatus = statusFilter === 'all' || deposit.status === statusFilter;
    const matchesSearch = !searchQuery || 
      deposit.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deposit.user_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'secondary';
    }
  };

  if (loading) {
    return <div className="p-4">Loading INR deposits...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">INR Deposits Management</h2>
        <Badge variant="secondary">
          {deposits.length} Total Deposits
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by reference or user ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="status">Status Filter</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deposits Table */}
      <Card>
        <CardHeader>
          <CardTitle>Deposit Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDeposits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No deposits found matching your criteria
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeposits.map((deposit) => (
                  <TableRow key={deposit.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(deposit.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{deposit.method}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      ₹{deposit.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {deposit.reference || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(deposit.status)}>
                        {deposit.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedDeposit(deposit);
                          setPreviewModalOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Transaction Preview Modal */}
      <TransactionPreviewModal
        open={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        transaction={selectedDeposit}
        type="deposit"
        onApprove={() => selectedDeposit && handleApprove(selectedDeposit)}
        onReject={() => selectedDeposit && handleReject(selectedDeposit)}
        isProcessing={processing}
      />
    </div>
  );
}