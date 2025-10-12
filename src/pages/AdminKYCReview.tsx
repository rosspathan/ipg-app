import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Eye, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface KYCNotification {
  id: string;
  kyc_profile_id: string;
  user_id: string;
  level: 'L0' | 'L1' | 'L2';
  status: 'pending' | 'reviewed' | 'dismissed';
  submitted_at: string;
  profile_data?: any;
  user_email?: string;
}

export default function AdminKYCReview() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<KYCNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<KYCNotification | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [requestedItems, setRequestedItems] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [filterLevel, setFilterLevel] = useState<'all' | 'L0' | 'L1' | 'L2'>('all');

  useEffect(() => {
    fetchNotifications();
    // Check admin access
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
    };
    checkAdmin();
  }, [navigate]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('kyc_admin_notifications')
        .select(`
          *,
          kyc_profiles_new!inner(data_json)
        `)
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      // Fetch user emails
      const userIds = data?.map(n => n.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('user_id', userIds);

      const notificationsWithEmails = (data?.map(n => ({
        ...n,
        level: n.level as 'L0' | 'L1' | 'L2',
        profile_data: (n as any).kyc_profiles_new?.data_json,
        user_email: profiles?.find(p => p.user_id === n.user_id)?.email
      })) || []) as KYCNotification[];

      setNotifications(notificationsWithEmails);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load KYC submissions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (action: 'approve' | 'reject' | 'needs_info') => {
    if (!selectedNotification) return;

    try {
      setProcessing(true);
      
      // Prepare rejection reason with requested items
      let rejectionData = null;
      if (action === 'needs_info') {
        const items = requestedItems.split('\n').filter(item => item.trim());
        rejectionData = JSON.stringify({
          message: reviewNotes,
          requested_items: items
        });
      } else if (action === 'reject') {
        rejectionData = reviewNotes;
      }

      // Update KYC profile status
      const { error: profileError } = await supabase
        .from('kyc_profiles_new')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          rejection_reason: rejectionData,
          reviewed_at: action === 'approve' ? new Date().toISOString() : null
        })
        .eq('id', selectedNotification.kyc_profile_id);

      if (profileError) throw profileError;

      // Update notification status
      const { error: notifError } = await supabase
        .from('kyc_admin_notifications')
        .update({
          status: 'reviewed',
          notes: reviewNotes,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', selectedNotification.id);

      if (notifError) throw notifError;

      const actionText = action === 'approve' ? 'approved' : action === 'needs_info' ? 'marked as needs info' : 'rejected';
      toast({
        title: "Success",
        description: `KYC ${actionText} successfully`
      });

      setSelectedNotification(null);
      setReviewNotes("");
      setRequestedItems("");
      fetchNotifications();
    } catch (error) {
      console.error('Error reviewing KYC:', error);
      toast({
        title: "Error",
        description: "Failed to update KYC status",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const getLevelBadge = (level: string) => {
    const colors = {
      L0: "bg-blue-500/20 text-blue-500 border-blue-500/30",
      L1: "bg-purple-500/20 text-purple-500 border-purple-500/30",
      L2: "bg-amber-500/20 text-amber-500 border-amber-500/30"
    };
    return colors[level as keyof typeof colors] || "";
  };

  const filteredNotifications = filterLevel === 'all' 
    ? notifications 
    : notifications.filter(n => n.level === filterLevel);

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40 safe-top">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="font-medium">KYC Review</span>
          </button>
          <Badge variant="outline">{filteredNotifications.length} Showing</Badge>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="sticky top-14 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto">
          {['all', 'L0', 'L1', 'L2'].map((level) => (
            <Button
              key={level}
              variant={filterLevel === level ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterLevel(level as any)}
            >
              {level === 'all' ? 'All' : level}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 pt-6 px-4">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading submissions...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No {filterLevel !== 'all' ? `${filterLevel} ` : ''}pending KYC submissions
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <Card key={notification.id} className="p-4 bg-card/60 backdrop-blur-xl border-border/40">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getLevelBadge(notification.level)}>
                      {notification.level}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(notification.submitted_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {notification.user_email || 'Unknown User'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    User ID: {notification.user_id.slice(0, 8)}...
                  </p>
                </div>

                <Button
                  onClick={() => setSelectedNotification(notification)}
                  className="w-full"
                  variant="outline"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Review Details
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>KYC Review - {selectedNotification?.level}</DialogTitle>
            <DialogDescription>
              Review and approve/reject this KYC submission
            </DialogDescription>
          </DialogHeader>

          {selectedNotification && (
            <div className="space-y-4">
              {/* User Info */}
              <div className="space-y-2">
                <h3 className="font-semibold">User Information</h3>
                <div className="bg-muted/50 p-3 rounded-lg space-y-1 text-sm">
                  <p><span className="font-medium">Email:</span> {selectedNotification.user_email}</p>
                  <p><span className="font-medium">Submitted:</span> {new Date(selectedNotification.submitted_at).toLocaleString()}</p>
                </div>
              </div>

              {/* Form Data */}
              <div className="space-y-2">
                <h3 className="font-semibold">Submitted Data</h3>
                <div className="bg-muted/50 p-3 rounded-lg space-y-2 text-sm">
                  {Object.entries(selectedNotification.profile_data || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                      <span>{typeof value === 'string' ? value : JSON.stringify(value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Message to User</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add a message explaining your decision..."
                  rows={3}
                />
              </div>

              {/* Requested Items (for Needs Info) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Requested Items (one per line)</label>
                <Textarea
                  value={requestedItems}
                  onChange={(e) => setRequestedItems(e.target.value)}
                  placeholder="e.g.\nClear selfie photo\nID back side\nProof of address"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  These items will be shown to the user as a checklist
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => handleReview('approve')}
                  disabled={processing}
                  className="w-full bg-success hover:bg-success/90"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleReview('needs_info')}
                  disabled={processing || !reviewNotes.trim()}
                  variant="outline"
                  className="w-full border-warning text-warning hover:bg-warning/10"
                >
                  Mark as Needs Info
                </Button>
                <Button
                  onClick={() => handleReview('reject')}
                  disabled={processing}
                  variant="destructive"
                  className="w-full"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}