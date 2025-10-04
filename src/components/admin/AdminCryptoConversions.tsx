import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, CheckCircle, XCircle, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ConversionRequest {
  id: string;
  user_id: string;
  email: string;
  crypto_symbol: string;
  crypto_amount: number;
  bsk_amount: number;
  transaction_hash: string;
  blockchain_explorer_link: string;
  screenshot_url: string;
  admin_wallet_address: string;
  status: string;
  admin_notes: string;
  created_at: string;
}

export function AdminCryptoConversions() {
  const [requests, setRequests] = useState<ConversionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ConversionRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("crypto_conversion_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (requestId: string, status: "approved" | "rejected") => {
    try {
      setProcessing(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const updateData: any = {
        status,
        reviewed_by: user.id,
        admin_notes: reviewNotes,
      };

      if (status === "approved") {
        updateData.approved_at = new Date().toISOString();
      } else {
        updateData.rejected_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("crypto_conversion_requests")
        .update(updateData)
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Request ${status} successfully`,
      });

      setSelectedRequest(null);
      setReviewNotes("");
      loadRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      reviewing: "outline",
      approved: "default",
      rejected: "destructive",
      completed: "default",
    };

    return <Badge variant={variants[status] || "outline"}>{status.toUpperCase()}</Badge>;
  };

  if (loading) {
    return <div className="text-center p-8">Loading conversion requests...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Crypto Conversion Requests</CardTitle>
          <CardDescription>
            Review and approve/reject cryptocurrency to BSK conversion requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Crypto</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>BSK</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No conversion requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.email}</TableCell>
                      <TableCell>{request.crypto_symbol}</TableCell>
                      <TableCell>{request.crypto_amount}</TableCell>
                      <TableCell>{request.bsk_amount.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedRequest(request)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Review Conversion Request</DialogTitle>
            <DialogDescription>
              Review the details and approve or reject this conversion request
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <p className="text-sm font-medium">{selectedRequest.email}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
                <div>
                  <Label>Cryptocurrency</Label>
                  <p className="text-sm font-medium">{selectedRequest.crypto_symbol}</p>
                </div>
                <div>
                  <Label>Crypto Amount</Label>
                  <p className="text-sm font-medium">{selectedRequest.crypto_amount}</p>
                </div>
                <div>
                  <Label>BSK Amount</Label>
                  <p className="text-sm font-medium">{selectedRequest.bsk_amount.toFixed(2)} BSK</p>
                </div>
                <div>
                  <Label>Date</Label>
                  <p className="text-sm">{new Date(selectedRequest.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <Label>Admin Wallet Address</Label>
                <p className="text-sm font-mono bg-muted p-2 rounded">
                  {selectedRequest.admin_wallet_address}
                </p>
              </div>

              <div>
                <Label>Transaction Hash</Label>
                <p className="text-sm font-mono bg-muted p-2 rounded">
                  {selectedRequest.transaction_hash}
                </p>
              </div>

              {selectedRequest.blockchain_explorer_link && (
                <div>
                  <Label>Blockchain Explorer</Label>
                  <a
                    href={selectedRequest.blockchain_explorer_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    View Transaction <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {selectedRequest.screenshot_url && (
                <div>
                  <Label>Screenshot</Label>
                  <img
                    src={selectedRequest.screenshot_url}
                    alt="Transaction proof"
                    className="mt-2 max-w-full rounded border"
                  />
                </div>
              )}

              {selectedRequest.admin_notes && (
                <div>
                  <Label>Previous Admin Notes</Label>
                  <p className="text-sm bg-muted p-2 rounded">{selectedRequest.admin_notes}</p>
                </div>
              )}

              {selectedRequest.status === "pending" && (
                <>
                  <div>
                    <Label htmlFor="notes">Admin Notes</Label>
                    <Textarea
                      id="notes"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add notes about this review..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="destructive"
                      onClick={() => handleReview(selectedRequest.id, "rejected")}
                      disabled={processing}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleReview(selectedRequest.id, "approved")}
                      disabled={processing}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
