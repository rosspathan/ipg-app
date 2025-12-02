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
  const username = (submission.profiles && 'username' in submission.profiles) ? submission.profiles.username : '';
  const displayName = (submission.profiles && 'display_name' in submission.profiles) ? submission.profiles.display_name : fullName;
  const avatarUrl = (submission.profiles && 'avatar_url' in submission.profiles) ? submission.profiles.avatar_url : dataJson?.selfie_url || dataJson?.documents?.selfie;

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Avatar */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="relative">
              <img
                src={avatarUrl || ''}
                alt={fullName || 'User'}
                className="h-20 w-20 rounded-full object-cover border-4 border-border"
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E';
                }}
              />
              <Badge 
                variant={getStatusColor(submission.status)} 
                className="absolute -bottom-1 -right-1 text-xs"
              >
                {getStatusLabel(submission.status)}
              </Badge>
            </div>
            
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold mb-1">{displayName || 'Unknown User'}</h2>
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground flex items-center gap-2">
                  📧 {email || 'No email'}
                </p>
                {phone && (
                  <p className="text-muted-foreground flex items-center gap-2">
                    📱 {phone}
                  </p>
                )}
                {username && username !== displayName && (
                  <p className="text-muted-foreground flex items-center gap-2">
                    👤 @{username}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <Label className="text-xs text-muted-foreground">Submission ID</Label>
              <p className="font-mono text-xs mt-1">{submission.id.slice(0, 13)}...</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Submitted</Label>
              <p className="text-sm mt-1">
                {submission.submitted_at ? format(new Date(submission.submitted_at), 'PPpp') : 'N/A'}
              </p>
            </div>
            {submission.reviewed_at && (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground">Reviewed</Label>
                  <p className="text-sm mt-1">
                    {format(new Date(submission.reviewed_at), 'PPpp')}
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

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
      {(submission.status === 'pending' || submission.status === 'submitted') && (
        <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 border-primary/30 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              🎁 BSK Reward Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-lg bg-background/80 backdrop-blur border border-primary/20">
              <div>
                <span className="text-sm font-medium block">User Reward</span>
                <span className="text-xs text-muted-foreground">Credited to holding balance</span>
              </div>
              <span className="font-bold text-xl text-primary">5 BSK</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-background/80 backdrop-blur border border-accent/20">
              <div>
                <span className="text-sm font-medium block">Sponsor Reward</span>
                <span className="text-xs text-muted-foreground">Credited to direct sponsor</span>
              </div>
              <span className="font-bold text-xl text-accent">5 BSK</span>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm font-medium flex items-center gap-2">
                <span className="text-2xl">💰</span>
                Total Distribution: <strong className="text-primary">10 BSK</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Rewards are automatically distributed upon approval
              </p>
            </div>
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
      {(submission.status === 'pending' || submission.status === 'submitted') && (
        <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm pt-6 pb-4 -mb-2 border-t-2 border-border lg:border-t-0 lg:static lg:pb-0 lg:bg-transparent">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button
              onClick={handleApprove}
              disabled={loading}
              className="flex-1 h-12 sm:h-14 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
              size="lg"
            >
              <CheckCircle className="mr-2 h-5 w-5" />
              ✅ Approve & Award 10 BSK
            </Button>
            <Button
              onClick={() => setRejectModalOpen(true)}
              disabled={loading}
              variant="destructive"
              className="flex-1 h-12 sm:h-14 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
              size="lg"
            >
              <XCircle className="mr-2 h-5 w-5" />
              ❌ Reject Submission
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
