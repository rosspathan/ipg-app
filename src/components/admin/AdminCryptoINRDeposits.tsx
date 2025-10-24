import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, CheckCircle, XCircle, Eye, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function AdminCryptoINRDeposits() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [adjustedAmount, setAdjustedAmount] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin-crypto-inr-requests', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('crypto_to_inr_requests')
        .select(`
          *,
          assets:crypto_asset_id(symbol, name, logo_url)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ requestId, adminNotes, adjustedAmount }: any) => {
      const { data, error } = await supabase.functions.invoke('approve-crypto-inr-deposit', {
        body: { requestId, adminNotes, adjustedAmount }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Deposit approved successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-crypto-inr-requests'] });
      setSelectedRequest(null);
      setAdminNotes('');
      setAdjustedAmount('');
    },
    onError: (error: any) => {
      toast.error('Failed to approve deposit', { description: error.message });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, rejectReason }: any) => {
      const { data, error } = await supabase.functions.invoke('reject-crypto-inr-deposit', {
        body: { requestId, rejectReason }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Deposit rejected');
      queryClient.invalidateQueries({ queryKey: ['admin-crypto-inr-requests'] });
      setSelectedRequest(null);
      setShowRejectDialog(false);
      setRejectReason('');
    },
    onError: (error: any) => {
      toast.error('Failed to reject deposit', { description: error.message });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ requestId, status }: any) => {
      const { error } = await supabase
        .from('crypto_to_inr_requests')
        .update({ status })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-crypto-inr-requests'] });
    },
  });

  const handleApprove = () => {
    if (!selectedRequest) return;

    approveMutation.mutate({
      requestId: selectedRequest.id,
      adminNotes: adminNotes.trim() || undefined,
      adjustedAmount: adjustedAmount ? parseFloat(adjustedAmount) : undefined,
    });
  };

  const handleReject = () => {
    if (!selectedRequest || !rejectReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }

    rejectMutation.mutate({
      requestId: selectedRequest.id,
      rejectReason: rejectReason.trim(),
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'warning',
      verifying: 'default',
      approved: 'success',
      rejected: 'destructive',
      canceled: 'secondary',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  if (isLoading) {
    return <div>Loading requests...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Crypto→INR Deposit Requests</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="verifying">Verifying</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!requests || requests.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No requests found</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  {request.assets?.logo_url && (
                    <img
                      src={request.assets.logo_url}
                      alt={request.assets.symbol}
                      className="w-12 h-12 rounded-full"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">
                        {request.crypto_amount} {request.assets?.symbol}
                      </h3>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>User ID: {request.user_id}</p>
                      <p>INR: ₹{request.inr_equivalent?.toFixed(2)} (Net: ₹{request.net_inr_credit?.toFixed(2)})</p>
                      <p>Submitted {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</p>
                      <p className="font-mono text-xs">TX: {request.tx_hash?.substring(0, 20)}...</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Review
                  </Button>

                  {(request.status === 'pending' || request.status === 'verifying') && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setAdminNotes('');
                          setAdjustedAmount('');
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>

                      {request.status === 'pending' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ requestId: request.id, status: 'verifying' })}
                        >
                          <Clock className="w-4 h-4 mr-1" />
                          Verify
                        </Button>
                      )}

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowRejectDialog(true);
                          setRejectReason('');
                        }}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detailed Review Dialog */}
      <Dialog open={!!selectedRequest && !showRejectDialog} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Deposit Request</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>User ID</Label>
                  <p className="text-sm font-mono text-xs">{selectedRequest.user_id}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div>{getStatusBadge(selectedRequest.status)}</div>
                </div>
                <div>
                  <Label>Crypto Amount</Label>
                  <p className="text-sm font-medium">{selectedRequest.crypto_amount} {selectedRequest.assets?.symbol}</p>
                </div>
                <div>
                  <Label>Network</Label>
                  <p className="text-sm">{selectedRequest.network}</p>
                </div>
                <div>
                  <Label>INR Equivalent</Label>
                  <p className="text-sm">₹{selectedRequest.inr_equivalent?.toFixed(2)}</p>
                </div>
                <div>
                  <Label>Fee</Label>
                  <p className="text-sm">₹{selectedRequest.total_fee?.toFixed(2)}</p>
                </div>
                <div>
                  <Label>Net INR Credit</Label>
                  <p className="text-sm font-bold text-primary">₹{selectedRequest.net_inr_credit?.toFixed(2)}</p>
                </div>
                <div>
                  <Label>Submitted</Label>
                  <p className="text-sm">{formatDistanceToNow(new Date(selectedRequest.created_at), { addSuffix: true })}</p>
                </div>
              </div>

              <div>
                <Label>Transaction Hash</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-muted p-2 rounded flex-1 break-all">
                    {selectedRequest.tx_hash}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = selectedRequest.network === 'Bitcoin'
                        ? `https://blockchair.com/bitcoin/transaction/${selectedRequest.tx_hash}`
                        : `https://bscscan.com/tx/${selectedRequest.tx_hash}`;
                      window.open(url, '_blank');
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {selectedRequest.proof_url && (
                <div>
                  <Label>Transaction Proof</Label>
                  <img
                    src={selectedRequest.proof_url}
                    alt="Proof"
                    className="mt-2 max-w-full rounded-lg border"
                  />
                </div>
              )}

              {selectedRequest.user_notes && (
                <div>
                  <Label>User Notes</Label>
                  <p className="text-sm bg-muted p-3 rounded mt-1">{selectedRequest.user_notes}</p>
                </div>
              )}

              {(selectedRequest.status === 'pending' || selectedRequest.status === 'verifying') && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="adjustedAmount">Adjust Amount (Optional)</Label>
                    <Input
                      id="adjustedAmount"
                      type="number"
                      step="any"
                      placeholder={selectedRequest.net_inr_credit}
                      value={adjustedAmount}
                      onChange={(e) => setAdjustedAmount(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to use calculated amount: ₹{selectedRequest.net_inr_credit?.toFixed(2)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
                    <Textarea
                      id="adminNotes"
                      placeholder="Internal notes or message to user..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <DialogFooter>
                    <Button
                      variant="destructive"
                      onClick={() => setShowRejectDialog(true)}
                    >
                      Reject
                    </Button>
                    <Button
                      onClick={handleApprove}
                      disabled={approveMutation.isPending}
                    >
                      {approveMutation.isPending ? 'Approving...' : 'Approve & Credit INR'}
                    </Button>
                  </DialogFooter>
                </>
              )}

              {selectedRequest.admin_notes && (
                <div>
                  <Label>Admin Notes</Label>
                  <p className="text-sm bg-muted p-3 rounded mt-1">{selectedRequest.admin_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Deposit Request</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejectReason">Rejection Reason *</Label>
              <Textarea
                id="rejectReason"
                placeholder="Explain why this deposit is being rejected..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
