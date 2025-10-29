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

  const dataJson = submission.data_json as any;
  const personal = dataJson?.personal_details;
  const address = dataJson?.address_details;
  const idDoc = dataJson?.id_document;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">
            {personal?.full_name || 'Unknown User'}
          </h2>
          <Badge>{submission.status}</Badge>
        </div>
        <p className="text-muted-foreground">{submission.profiles?.email}</p>
        <p className="text-sm text-muted-foreground">
          Submitted: {submission.submitted_at ? format(new Date(submission.submitted_at), 'PPpp') : 'N/A'}
        </p>
      </div>

      {/* Personal Details */}
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
            <p className="font-medium">{personal?.full_name || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Date of Birth</Label>
            <p className="font-medium">{personal?.date_of_birth || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Nationality</Label>
            <p className="font-medium">{personal?.nationality || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Phone</Label>
            <p className="font-medium">{personal?.phone || 'N/A'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Address Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Address Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label className="text-muted-foreground">Street Address</Label>
            <p className="font-medium">{address?.street_address || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">City</Label>
            <p className="font-medium">{address?.city || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">State/Province</Label>
            <p className="font-medium">{address?.state_province || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Postal Code</Label>
            <p className="font-medium">{address?.postal_code || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Country</Label>
            <p className="font-medium">{address?.country || 'N/A'}</p>
          </div>
        </CardContent>
      </Card>

      {/* ID Document Details */}
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
            <p className="font-medium">{idDoc?.document_type || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Document Number</Label>
            <p className="font-medium">{idDoc?.document_number || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Issue Date</Label>
            <p className="font-medium">{idDoc?.issue_date || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Expiry Date</Label>
            <p className="font-medium">{idDoc?.expiry_date || 'N/A'}</p>
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
              {dataJson?.documents?.id_front ? (
                <ImageViewer
                  imageUrl={dataJson.documents.id_front}
                  alt="ID Front"
                  className="h-[400px]"
                />
              ) : (
                <p className="text-center py-12 text-muted-foreground">No image uploaded</p>
              )}
            </TabsContent>
            <TabsContent value="back" className="mt-4">
              {dataJson?.documents?.id_back ? (
                <ImageViewer
                  imageUrl={dataJson.documents.id_back}
                  alt="ID Back"
                  className="h-[400px]"
                />
              ) : (
                <p className="text-center py-12 text-muted-foreground">No image uploaded</p>
              )}
            </TabsContent>
            <TabsContent value="selfie" className="mt-4">
              {dataJson?.documents?.selfie ? (
                <ImageViewer
                  imageUrl={dataJson.documents.selfie}
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
          <CardContent>
            <p className="text-sm text-muted-foreground">
              ✅ <span className="font-semibold text-primary">5 BSK (holding)</span> will be credited directly to the user's account upon approval.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              No rewards are distributed to sponsors for KYC approvals.
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
              Approve & Award 5 BSK
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
