import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Eye, Search } from 'lucide-react';
import type { KYCSubmission } from '@/hooks/useKYCSimple';

export default function AdminKYCSimple() {
  const [submissions, setSubmissions] = useState<KYCSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<KYCSubmission | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('kyc_submissions_simple')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions((data || []) as KYCSubmission[]);
    } catch (error: any) {
      console.error('Error fetching KYC submissions:', error);
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedSubmission) return;
    
    try {
      setProcessing(true);
      
      // Update status to approved
      const { error: updateError } = await supabase
        .from('kyc_submissions_simple')
        .update({
          status: 'approved',
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedSubmission.id);

      if (updateError) throw updateError;

      // Call commission distribution edge function
      const { error: commissionError } = await supabase.functions.invoke('process-kyc-commissions', {
        body: { user_id: selectedSubmission.user_id },
      });

      if (commissionError) {
        console.error('Commission distribution error:', commissionError);
        toast.error('KYC approved but commission distribution failed');
      } else {
        toast.success('KYC approved! 5 BSK credited + commissions distributed');
      }

      setSelectedSubmission(null);
      setAdminNotes('');
      await fetchSubmissions();
    } catch (error: any) {
      console.error('Error approving KYC:', error);
      toast.error('Failed to approve KYC');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission || !rejectReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    
    try {
      setProcessing(true);
      
      const { error } = await supabase
        .from('kyc_submissions_simple')
        .update({
          status: 'rejected',
          rejection_reason: rejectReason,
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedSubmission.id);

      if (error) throw error;

      toast.success('KYC rejected');
      setShowRejectDialog(false);
      setSelectedSubmission(null);
      setRejectReason('');
      setAdminNotes('');
      await fetchSubmissions();
    } catch (error: any) {
      console.error('Error rejecting KYC:', error);
      toast.error('Failed to reject KYC');
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('kyc_submissions_simple_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'kyc_submissions_simple' },
        () => fetchSubmissions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredSubmissions = submissions.filter(sub => {
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const matchesSearch = !searchQuery || 
      sub.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.phone.includes(searchQuery) ||
      sub.id_number.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">KYC Review Dashboard</h1>
        <p className="text-muted-foreground">Review and approve identity verifications</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or ID number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">All ({submissions.length})</TabsTrigger>
            <TabsTrigger value="submitted">Submitted ({submissions.filter(s => s.status === 'submitted').length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({submissions.filter(s => s.status === 'approved').length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({submissions.filter(s => s.status === 'rejected').length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Submissions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredSubmissions.map(submission => (
          <Card key={submission.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{submission.full_name}</h3>
                <p className="text-sm text-muted-foreground">{submission.phone}</p>
                <p className="text-xs text-muted-foreground">{submission.id_type}: {submission.id_number}</p>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                submission.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                submission.status === 'submitted' ? 'bg-blue-500/20 text-blue-500' :
                submission.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                'bg-muted text-muted-foreground'
              }`}>
                {submission.status}
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground space-y-1">
              <p>{submission.city}, {submission.country}</p>
              <p>Submitted: {new Date(submission.submitted_at || submission.created_at).toLocaleDateString()}</p>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => setSelectedSubmission(submission)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          </Card>
        ))}
      </div>

      {filteredSubmissions.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No submissions found</p>
        </Card>
      )}

      {/* Review Dialog */}
      {selectedSubmission && (
        <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>KYC Submission Review</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Personal Info */}
              <div>
                <h3 className="font-semibold mb-2">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Name:</span> {selectedSubmission.full_name}</div>
                  <div><span className="text-muted-foreground">DOB:</span> {selectedSubmission.date_of_birth}</div>
                  <div><span className="text-muted-foreground">Nationality:</span> {selectedSubmission.nationality}</div>
                  <div><span className="text-muted-foreground">Phone:</span> {selectedSubmission.phone}</div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="font-semibold mb-2">Address</h3>
                <div className="text-sm space-y-1">
                  <p>{selectedSubmission.address_line1}</p>
                  {selectedSubmission.address_line2 && <p>{selectedSubmission.address_line2}</p>}
                  <p>{selectedSubmission.city}, {selectedSubmission.state} {selectedSubmission.postal_code}</p>
                  <p>{selectedSubmission.country}</p>
                </div>
              </div>

              {/* ID Document */}
              <div>
                <h3 className="font-semibold mb-2">ID Document</h3>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div><span className="text-muted-foreground">Type:</span> {selectedSubmission.id_type}</div>
                  <div><span className="text-muted-foreground">Number:</span> {selectedSubmission.id_number}</div>
                </div>

                {/* Document Images */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs">ID Front</Label>
                    <img src={selectedSubmission.id_front_url} alt="ID Front" className="w-full h-32 object-cover rounded border" />
                  </div>
                  <div>
                    <Label className="text-xs">ID Back</Label>
                    <img src={selectedSubmission.id_back_url} alt="ID Back" className="w-full h-32 object-cover rounded border" />
                  </div>
                  <div>
                    <Label className="text-xs">Selfie</Label>
                    <img src={selectedSubmission.selfie_url} alt="Selfie" className="w-full h-32 object-cover rounded border" />
                  </div>
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <Label>Admin Notes (Optional)</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes..."
                  rows={3}
                />
              </div>

              {/* Actions */}
              {selectedSubmission.status === 'submitted' && (
                <DialogFooter className="gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={processing}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={processing}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve & Credit 5 BSK
                  </Button>
                </DialogFooter>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject KYC Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rejection Reason *</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this KYC is being rejected..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing || !rejectReason.trim()}>
              Reject Submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
