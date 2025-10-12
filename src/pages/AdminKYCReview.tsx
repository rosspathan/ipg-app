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
  const [processing, setProcessing] = useState(false);

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

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!selectedNotification) return;

    try {
      setProcessing(true);
      
      // Update KYC profile status
      const { error: profileError } = await supabase
        .from('kyc_profiles_new')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          rejection_reason: action === 'reject' ? reviewNotes : null,
          reviewed_at: new Date().toISOString()
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

      toast({
        title: "Success",
        description: `KYC ${action === 'approve' ? 'approved' : 'rejected'} successfully`
      });

      setSelectedNotification(null);
      setReviewNotes("");
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
          <Badge variant="outline">{notifications.length} Pending</Badge>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 pt-6 px-4">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading submissions...
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No pending KYC submissions
          </div>
        ) : (
          notifications.map((notification) => (
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
                <label className="text-sm font-medium">Review Notes</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about your decision..."
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={() => handleReview('approve')}
                  disabled={processing}
                  className="flex-1 bg-success hover:bg-success/90"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleReview('reject')}
                  disabled={processing}
                  variant="destructive"
                  className="flex-1"
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