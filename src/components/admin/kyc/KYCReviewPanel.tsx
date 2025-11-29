import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { KYCSubmissionWithUser } from '@/hooks/useAdminKYC';
import { ImageViewer } from './ImageViewer';
import { RejectModal } from './RejectModal';
import { CheckCircle, XCircle, User, MapPin, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface KYCReviewPanelProps {
  submission: KYCSubmissionWithUser;
  onApprove: (adminNotes?: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
}

export function KYCReviewPanel({ submission, onApprove, onReject }: KYCReviewPanelProps) {
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
      case 'pending':
        return 'default';
      case 'approved':
        return 'outline';
      case 'rejected':
        return 'destructive';
      case 'needs_info':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'submitted':
      case 'pending':
        return 'Pending Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'needs_info':
        return 'Needs Info';
      default:
        return status;
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    await onApprove(adminNotes);
    setLoading(false);
  };

  const handleReject = async (reason: string) => {
    setLoading(true);
    await onReject(reason);
    setRejectModalOpen(false);
    setLoading(false);
  };

  // Use flat data structure from data_json
  const dataJson = submission.data_json as any;
  const fullName = submission.full_name_computed || dataJson?.full_name;
  const email = submission.profiles?.email || submission.email_computed || dataJson?.email;
  const phone = submission.phone_computed || dataJson?.phone;

  return (
    <div className="space-y-6">
      {/* Header with enhanced info */}
      <div className="border-b pb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-2xl font-bold">{fullName || 'Unknown User'}</h2>
            <p className="text-muted-foreground">{email}</p>
          </div>
          <Badge variant={getStatusColor(submission.status)} className="text-base px-3 py-1">
            {getStatusLabel(submission.status)}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Submission ID:</span>
            <p className="font-mono text-xs">{submission.id.slice(0, 8)}...</p>
          </div>
          <div>
            <span className="text-muted-foreground">Submitted:</span>
            <p>{submission.submitted_at ? format(new Date(submission.submitted_at), 'PPpp') : 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Personal Details - Using flat structure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground">Full Name</Label>
            <p className="font-medium">{fullName || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Date of Birth</Label>
            <p className="font-medium">{dataJson?.date_of_birth || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Email</Label>
            <p className="font-medium">{email || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Phone</Label>
            <p className="font-medium">{phone || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Nationality</Label>
            <p className="font-medium">{dataJson?.nationality || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Gender</Label>
            <p className="font-medium">{dataJson?.gender || 'N/A'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Address Details - Using flat structure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Address Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label className="text-muted-foreground">Address Line 1</Label>
            <p className="font-medium">{dataJson?.address_line1 || 'N/A'}</p>
          </div>
          {dataJson?.address_line2 && (
            <div className="col-span-2">
              <Label className="text-muted-foreground">Address Line 2</Label>
              <p className="font-medium">{dataJson.address_line2}</p>
            </div>
          )}
          <div>
            <Label className="text-muted-foreground">City</Label>
            <p className="font-medium">{dataJson?.city || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">State/Province</Label>
            <p className="font-medium">{dataJson?.state || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Postal Code</Label>
            <p className="font-medium">{dataJson?.postal_code || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Country</Label>
            <p className="font-medium">{dataJson?.country || 'N/A'}</p>
          </div>
        </CardContent>
      </Card>

      {/* ID Document Details - Using flat structure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Identity Document
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground">Document Type</Label>
            <p className="font-medium">{dataJson?.id_type || dataJson?.document_type || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Document Number</Label>
            <p className="font-medium">{dataJson?.id_number || dataJson?.document_number || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Issue Date</Label>
            <p className="font-medium">{dataJson?.issue_date || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Expiry Date</Label>
            <p className="font-medium">{dataJson?.expiry_date || 'N/A'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Document Images */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="front" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="front">ID Front</TabsTrigger>
              <TabsTrigger value="back">ID Back</TabsTrigger>
              <TabsTrigger value="selfie">Selfie</TabsTrigger>
            </TabsList>
            <TabsContent value="front" className="mt-4">
              {(dataJson?.id_front_url || dataJson?.documents?.id_front) ? (
                <ImageViewer
                  imageUrl={dataJson?.id_front_url || dataJson?.documents?.id_front}
                  alt="ID Front"
                  className="h-[400px]"
                />
              ) : (
                <p className="text-center py-12 text-muted-foreground">No image uploaded</p>
              )}
            </TabsContent>
            <TabsContent value="back" className="mt-4">
              {(dataJson?.id_back_url || dataJson?.documents?.id_back) ? (
                <ImageViewer
                  imageUrl={dataJson?.id_back_url || dataJson?.documents?.id_back}
                  alt="ID Back"
                  className="h-[400px]"
                />
              ) : (
                <p className="text-center py-12 text-muted-foreground">No image uploaded</p>
              )}
            </TabsContent>
            <TabsContent value="selfie" className="mt-4">
              {(dataJson?.selfie_url || dataJson?.documents?.selfie) ? (
                <ImageViewer
                  imageUrl={dataJson?.selfie_url || dataJson?.documents?.selfie}
                  alt="Selfie"
                  className="h-[400px]"
                />
              ) : (
                <p className="text-center py-12 text-muted-foreground">No image uploaded</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* BSK Reward Info */}
      {submission.status === 'pending' && (
        <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🎁 BSK Reward Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
              <span className="text-sm font-medium">User Reward</span>
              <span className="font-semibold text-primary">5 BSK (holding)</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-accent/5">
              <span className="text-sm font-medium">Sponsor Reward</span>
              <span className="font-semibold text-accent">5 BSK (holding)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Total of <strong>10 BSK</strong> will be distributed upon approval (5 to user + 5 to direct sponsor)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Admin Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Add notes about this review (optional)..."
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* Action Buttons - Sticky on mobile */}
      {submission.status === 'pending' && (
        <div className="sticky bottom-0 left-0 right-0 bg-background pt-4 pb-2 -mb-2 border-t lg:border-t-0 lg:static lg:pb-0">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button
              onClick={handleApprove}
              disabled={loading}
              className="flex-1"
              size="lg"
            >
              <CheckCircle className="mr-2 h-5 w-5" />
              Approve & Award 10 BSK Total
            </Button>
            <Button
              onClick={() => setRejectModalOpen(true)}
              disabled={loading}
              variant="destructive"
              className="flex-1"
              size="lg"
            >
              <XCircle className="mr-2 h-5 w-5" />
              Reject
            </Button>
          </div>
        </div>
      )}

      <RejectModal
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onConfirm={handleReject}
        loading={loading}
      />
    </div>
  );
}
