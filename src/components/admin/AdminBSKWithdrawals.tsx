import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Clock, Banknote, Bitcoin, Eye } from 'lucide-react';
import { TransactionPreviewModal } from '@/components/admin/TransactionPreviewModal';

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount_bsk: number;
  withdrawal_type: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  account_holder_name?: string;
  crypto_symbol?: string;
  crypto_address?: string;
  crypto_network?: string;
  status: string;
  admin_notes?: string;
  created_at: string;
  profiles?: {
    email: string;
    full_name?: string;
  };
}

export const AdminBSKWithdrawals = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('bsk_withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch user profiles separately
      const requestsWithProfiles = await Promise.all(
        (data || []).map(async (request) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', request.user_id)
            .single();
          
          return {
            ...request,
            profiles: profile || { email: 'N/A', full_name: undefined }
          };
        })
      );
      
      setRequests(requestsWithProfiles);
    } catch (error: any) {
      console.error('Error loading requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load withdrawal requests',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (requestId: string, newStatus: 'approved' | 'rejected' | 'completed') => {
    setProcessing(true);
    try {
      const user = await supabase.auth.getUser();

      const { error } = await supabase
        .from('bsk_withdrawal_requests')
        .update({
          status: newStatus,
          admin_notes: adminNotes || null,
          processed_at: new Date().toISOString(),
          processed_by: user.data.user?.id
        })
        .eq('id', requestId);

      if (error) throw error;

      // Create audit log
      await supabase.from('audit_logs').insert({
        user_id: user.data.user?.id,
        action: `bsk_withdrawal_${newStatus}`,
        resource_type: 'bsk_withdrawal_requests',
        resource_id: requestId,
        new_values: { status: newStatus, admin_notes: adminNotes }
      });

      toast({
        title: 'Status Updated',
        description: `Request has been ${newStatus}`
      });

      setDialogOpen(false);
      setPreviewModalOpen(false);
      setSelectedRequest(null);
      setAdminNotes('');
      loadRequests();
    } catch (error: any) {
      console.error('Error updating request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update request',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const openDialog = (request: WithdrawalRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.admin_notes || '');
    setPreviewModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
      completed: 'outline'
    };
    
    const icons: Record<string, any> = {
      pending: Clock,
      approved: CheckCircle,
      rejected: XCircle,
      completed: CheckCircle
    };

    const Icon = icons[status] || Clock;

    return (
      <Badge variant={variants[status] || 'default'}>
        <Icon className="h-3 w-3 mr-1" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>BSK Withdrawal Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">
                Pending ({pendingRequests.length})
              </TabsTrigger>
              <TabsTrigger value="processed">
                Processed ({processedRequests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">
              {pendingRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending requests</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="font-medium">{request.profiles?.full_name || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">{request.profiles?.email}</div>
                        </TableCell>
                        <TableCell className="font-mono">{request.amount_bsk} BSK</TableCell>
                        <TableCell>
                          {request.withdrawal_type === 'bank' ? (
                            <Badge variant="outline">
                              <Banknote className="h-3 w-3 mr-1" />
                              Bank
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Bitcoin className="h-3 w-3 mr-1" />
                              Crypto
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {request.withdrawal_type === 'bank' ? (
                            <div className="text-sm">
                              <div>{request.bank_name}</div>
                              <div className="text-muted-foreground">{request.account_holder_name}</div>
                              <div className="font-mono text-xs">{request.account_number}</div>
                              <div className="text-xs">{request.ifsc_code}</div>
                            </div>
                          ) : (
                            <div className="text-sm">
                              <div>{request.crypto_symbol} ({request.crypto_network})</div>
                              <div className="font-mono text-xs truncate">{request.crypto_address}</div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(request.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => openDialog(request)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="processed" className="mt-4">
              {processedRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No processed requests</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="font-medium">{request.profiles?.full_name || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">{request.profiles?.email}</div>
                        </TableCell>
                        <TableCell className="font-mono">{request.amount_bsk} BSK</TableCell>
                        <TableCell>
                          {request.withdrawal_type === 'bank' ? (
                            <Badge variant="outline">
                              <Banknote className="h-3 w-3 mr-1" />
                              Bank
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Bitcoin className="h-3 w-3 mr-1" />
                              Crypto
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(request.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell className="max-w-xs truncate text-sm">
                          {request.admin_notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Transaction Preview Modal */}
      <TransactionPreviewModal
        open={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        transaction={selectedRequest}
        type="withdrawal"
        onApprove={() => selectedRequest && handleAction(selectedRequest.id, 'approved')}
        onReject={() => selectedRequest && handleAction(selectedRequest.id, 'rejected')}
        isProcessing={processing}
      />

      {/* Legacy Dialog - kept for backwards compatibility */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
...
      </Dialog>
    </>
  );
};
